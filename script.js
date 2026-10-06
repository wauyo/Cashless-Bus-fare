const SUPABASE_URL = "https://fcdoixlxylazmosevbtx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_M2NTtqT-2sMrlPSWF4embg_fbbzjvB1";
const PAYSTACK_PUBLIC_KEY = "pk_test_your_paystack_public_key_here"; // Replace with your key

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentRoute = null;

document.addEventListener("DOMContentLoaded", () => {
  fetchRoutes();

  const seatsInput = document.getElementById("seats");
  seatsInput.addEventListener("input", updateTotalFare);

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
    container.innerHTML = "<p>No routes available currently.</p>";
    return;
  }

  container.innerHTML = routes.map(r => `
    <div class="route-item">
      <div>
        <strong>${r.origin} ➔ ${r.destination}</strong><br>
        <small>Matatu: ${r.matatus ? r.matatus.registration_number : 'N/A'} | Time: ${new Date(r.departure_time).toLocaleString()}</small><br>
        <small>Available Seats: ${r.available_seats}</small>
      </div>
      <div>
        <strong>KES ${r.fare}</strong><br>
        <button onclick="selectRoute('${r.id}', ${r.fare}, ${r.available_seats}, '${r.origin}', '${r.destination}', '${r.departure_time}')">Book Now</button>
      </div>
    </div>
  `).join("");
}

function selectRoute(id, fare, availableSeats, origin, destination, time) {
  currentRoute = { id, fare, availableSeats, origin, destination, time };
  document.getElementById("selected-route-id").value = id;
  document.getElementById("selected-fare").value = fare;
  document.getElementById("booking-card").style.display = "block";
  updateTotalFare();
  window.scrollTo({ top: document.getElementById("booking-card").offsetTop, behavior: 'smooth' });
}

function updateTotalFare() {
  const fare = parseFloat(document.getElementById("selected-fare").value) || 0;
  const seats = parseInt(document.getElementById("seats").value) || 1;
  document.getElementById("total-fare").innerText = fare * seats;
}

async function handleBooking(e) {
  e.preventDefault();

  const name = document.getElementById("cust-name").value;
  const email = document.getElementById("cust-email").value;
  const phone = document.getElementById("cust-phone").value;
  const seats = parseInt(document.getElementById("seats").value);
  const totalAmount = currentRoute.fare * seats;

  if (seats > currentRoute.availableSeats) {
    alert("Not enough available seats.");
    return;
  }

  // Trigger Paystack STK Push
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: totalAmount * 100, // Paystack operates in kobo/cents
    currency: "KES",
    ref: 'BK_' + Math.floor((Math.random() * 1000000000) + 1),
    metadata: {
      custom_fields: [
        { display_name: "Mobile Number", variable_name: "mobile_number", value: phone }
      ]
    },
    callback: async function(response) {
      // Payment successful, insert booking into database
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
        // Update available seats count
        await supabaseClient
          .from("routes")
          .update({ available_seats: currentRoute.availableSeats - seats })
          .eq("id", currentRoute.id);

        alert(`Booking successful! Confirmation sent to ${email}.\nDeparts at: ${new Date(currentRoute.time).toLocaleString()}`);
        location.reload();
      } else {
        alert("Payment was completed, but recording booking failed. Please contact support.");
      }
    },
    onClose: function() {
      alert("Transaction was cancelled.");
    }
  });

  handler.openIframe();
}