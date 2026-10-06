const SUPABASE_URL = "https://fcdoixlxylazmosevbtx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_M2NTtqT-2sMrlPSWF4embg_fbbzjvB1";
const PAYSTACK_PUBLIC_KEY = "pk_test_b9b9f4ff71c2dc350f8ff9a9c72b75dde32ddb7b";
const BREVO_API_KEY = "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";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentRoute = null;

document.addEventListener("DOMContentLoaded", () => {
  fetchRoutes();
  document.getElementById("seats").addEventListener("input", updateTotalFare);
  document.getElementById("booking-form").addEventListener("submit", handleBooking);
});

async function fetchRoutes() {
  const container = document.getElementById("routes-list");
  const { data: routes, error } = await supabaseClient
    .from("routes")
    .select("*, matatus(registration_number)")
    .gt("available_seats", 0);

  if (error) {
    container.innerHTML = "<p>Error loading routes.</p>";
    return;
  }

  if (!routes || routes.length === 0) {
    container.innerHTML = "<p>No active routes available right now.</p>";
    return;
  }

  container.innerHTML = routes.map(r => `
    <div class="route-item">
      <div class="route-info">
        <h3>${r.origin} ➔ ${r.destination}</h3>
        <p><small>Vehicle: ${r.matatus ? r.matatus.registration_number : 'N/A'}</small></p>
        <p><small>Departure: ${new Date(r.departure_time).toLocaleString()}</small></p>
        <p><small>Seats Available: ${r.available_seats}</small></p>
      </div>
      <div class="route-action">
        <p style="margin-bottom: 0.5rem; font-weight: bold; color: var(--primary);">KES ${r.fare}</p>
        <button onclick="selectRoute('${r.id}', ${r.fare}, ${r.available_seats}, '${r.origin}', '${r.destination}', '${r.departure_time}')">Book Now</button>
      </div>
    </div>
  `).join("");
}

function selectRoute(id, fare, availableSeats, origin, destination, time) {
  currentRoute = { id, fare, availableSeats, origin, destination, time };
  document.getElementById("booking-card").style.display = "block";
  updateTotalFare();
  window.scrollTo({ top: document.getElementById("booking-card").offsetTop - 20, behavior: 'smooth' });
}

function updateTotalFare() {
  const seats = parseInt(document.getElementById("seats").value) || 1;
  document.getElementById("total-fare").innerText = (currentRoute.fare * seats).toLocaleString();
}

async function handleBooking(e) {
  e.preventDefault();

  const name = document.getElementById("cust-name").value;
  const email = document.getElementById("cust-email").value;
  const phone = document.getElementById("cust-phone").value;
  const seats = parseInt(document.getElementById("seats").value);
  const totalAmount = currentRoute.fare * seats;

  if (seats > currentRoute.availableSeats) {
    alert("Requested seats exceed available capacity.");
    return;
  }

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: totalAmount * 100,
    currency: "KES",
    ref: 'BK_' + Math.floor((Math.random() * 100000000) + 1),
    callback: async function(response) {
      const { data, error } = await supabaseClient
        .from("bookings")
        .insert([{
          route_id: currentRoute.id,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          seats_booked: seats,
          total_amount: totalAmount,
          payment_status: "completed",
          paystack_reference: response.reference
        }]);

      if (!error) {
        await supabaseClient
          .from("routes")
          .update({ available_seats: currentRoute.availableSeats - seats })
          .eq("id", currentRoute.id);

        await sendEmailReceipt({
          email,
          name,
          origin: currentRoute.origin,
          destination: currentRoute.destination,
          time: new Date(currentRoute.time).toLocaleString(),
          seats,
          amount: totalAmount,
          ref: response.reference
        });

        alert("Booking completed! Ticket details sent to your email.");
        location.reload();
      } else {
        alert("Booking error: " + error.message);
      }
    },
    onClose: function() {
      alert("Payment cancelled.");
    }
  });

  handler.openIframe();
}

async function sendEmailReceipt(details) {
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "Matatu Booking", email: "wauyo.grant@gmail.com" },
        to: [{ email: details.email, name: details.name }],
        subject: `Bus Ticket Confirmation - ${details.origin} to ${details.destination}`,
        htmlContent: `
          <h2>Booking Ticket Confirmation</h2>
          <p>Dear <strong>${details.name}</strong>,</p>
          <p>Your booking has been successful! Here are your ticket details:</p>
          <ul>
            <li><strong>Route:</strong> ${details.origin} to ${details.destination}</li>
            <li><strong>Departure Time:</strong> ${details.time}</li>
            <li><strong>Seats Booked:</strong> ${details.seats}</li>
            <li><strong>Total Paid:</strong> KES ${details.amount}</li>
            <li><strong>Payment Reference:</strong> ${details.ref}</li>
          </ul>
          <p>Have a safe journey!</p>
        `
      })
    });
  } catch (err) {
    console.error("Brevo email failed:", err);
  }
}