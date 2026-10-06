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
  
  // Handle return redirect from Paystack payment page
  checkPaymentReturn();
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
        <button type="button" onclick="selectRoute('${r.id}', ${r.fare}, ${r.available_seats}, '${r.origin}', '${r.destination}', '${r.departure_time}')">Book Now</button>
      </div>
    </div>
  `).join("");
}

function selectRoute(id, fare, availableSeats, origin, destination, time) {
  currentRoute = { id, fare, availableSeats, origin, destination, time };
  document.getElementById("booking-card").style.display = "block";
  document.getElementById("seats").value = 1;
  updateTotalFare();
  window.scrollTo({ top: document.getElementById("booking-card").offsetTop - 20, behavior: 'smooth' });
}

function updateTotalFare() {
  if (!currentRoute) return;
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

  const payBtn = document.getElementById("pay-btn");
  payBtn.disabled = true;
  payBtn.innerText = "Redirecting to Paystack...";

  // Save temporary booking details to localStorage before redirecting
  const bookingData = {
    route_id: currentRoute.id,
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    seats_booked: seats,
    total_amount: totalAmount,
    origin: currentRoute.origin,
    destination: currentRoute.destination,
    time: currentRoute.time,
    availableSeats: currentRoute.availableSeats
  };
  localStorage.setItem("pending_booking", JSON.stringify(bookingData));

  try {
    // Direct API call to Paystack Transaction Initialize
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_PUBLIC_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        amount: totalAmount * 100, // Amount in cents (KES * 100)
        currency: "KES",
        callback_url: window.location.href.split('?')[0] + "?status=success"
      })
    });

    const result = await response.json();

    if (result.status && result.data.authorization_url) {
      // Redirect browser directly to Paystack official checkout page
      window.location.href = result.data.authorization_url;
    } else {
      alert("Failed to initialize payment: " + (result.message || "Unknown error"));
      payBtn.disabled = false;
      payBtn.innerText = "Pay with Paystack (M-Pesa)";
    }
  } catch (err) {
    console.error("Paystack Direct API Error:", err);
    alert("Error connecting to Paystack. Please check your internet connection.");
    payBtn.disabled = false;
    payBtn.innerText = "Pay with Paystack (M-Pesa)";
  }
}

async function checkPaymentReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("status");
  const reference = urlParams.get("reference") || urlParams.get("trxref");
  const pendingBooking = localStorage.getItem("pending_booking");

  if (status === "success" && reference && pendingBooking) {
    const details = JSON.parse(pendingBooking);

    // Save completed booking to Supabase
    const { data, error } = await supabaseClient
      .from("bookings")
      .insert([{
        route_id: details.route_id,
        customer_name: details.customer_name,
        customer_email: details.customer_email,
        customer_phone: details.customer_phone,
        seats_booked: details.seats_booked,
        total_amount: details.total_amount,
        payment_status: "completed",
        paystack_reference: reference
      }]);

    if (!error) {
      // Decrement seats
      await supabaseClient
        .from("routes")
        .update({ available_seats: details.availableSeats - details.seats_booked })
        .eq("id", details.route_id);

      // Send confirmation email via Brevo
      await sendEmailReceipt({
        email: details.customer_email,
        name: details.customer_name,
        origin: details.origin,
        destination: details.destination,
        time: new Date(details.time).toLocaleString(),
        seats: details.seats_booked,
        amount: details.total_amount,
        ref: reference
      });

      localStorage.removeItem("pending_booking");
      alert("Booking & Payment Successful! Check your email for ticket details.");
      window.location.href = window.location.pathname; // Clean URL parameters
    } else {
      alert("Payment verified, but saving booking failed: " + error.message);
    }
  }
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
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
            <h2 style="color: #10b981;">Booking Ticket Confirmation</h2>
            <p>Dear <strong>${details.name}</strong>,</p>
            <p>Your ticket has been successfully booked!</p>
            <hr />
            <ul>
              <li><strong>Route:</strong> ${details.origin} ➔ ${details.destination}</li>
              <li><strong>Departure Time:</strong> ${details.time}</li>
              <li><strong>Seats Booked:</strong> ${details.seats}</li>
              <li><strong>Total Paid:</strong> KES ${details.amount}</li>
              <li><strong>Transaction Reference:</strong> ${details.ref}</li>
            </ul>
            <hr />
            <p>Thank you for traveling with us!</p>
          </div>
        `
      })
    });
  } catch (err) {
    console.error("Brevo email failed:", err);
  }
}
