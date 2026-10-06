const SUPABASE_URL = "https://fcdoixlxylazmosevbtx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_M2NTtqT-2sMrlPSWF4embg_fbbzjvB1";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("a-email").value;
  const pin = document.getElementById("a-pin").value;

  const { data, error } = await supabaseClient
    .from("matatus")
    .select("*")
    .eq("email", email)
    .eq("pin", pin)
    .eq("role", "admin")
    .single();

  if (error || !data) {
    alert("Admin login failed.");
    return;
  }

  document.getElementById("admin-login-card").style.display = "none";
  document.getElementById("admin-dash").style.display = "block";

  loadAllData();
});

document.getElementById("reg-bus-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient
    .from("matatus")
    .insert([{
      registration_number: document.getElementById("b-reg").value,
      owner_name: document.getElementById("b-owner").value,
      driver_name: document.getElementById("b-driver").value,
      email: document.getElementById("b-email").value,
      phone_number: document.getElementById("b-phone").value,
      pin: document.getElementById("b-pin").value,
      role: 'driver'
    }]);

  if (!error) {
    alert("Bus and Driver registered successfully!");
    document.getElementById("reg-bus-form").reset();
    loadBuses();
  } else {
    alert("Registration error: " + error.message);
  }
});

function loadAllData() {
  loadBuses();
  loadRoutes();
  loadBookings();
}

async function loadBuses() {
  const { data } = await supabaseClient.from("matatus").select("*");
  const container = document.getElementById("bus-table-container");
  if (!data) return;

  container.innerHTML = `
    <table>
      <thead>
        <tr><th>Plate</th><th>Owner</th><th>Driver</th><th>Email</th><th>Role</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${data.map(m => `
          <tr>
            <td>${m.registration_number || 'N/A'}</td>
            <td>${m.owner_name}</td>
            <td>${m.driver_name || 'N/A'}</td>
            <td>${m.email}</td>
            <td>${m.role}</td>
            <td>${m.role !== 'admin' ? `<button class="btn-danger" onclick="deleteMatatu('${m.id}')">Remove</button>` : 'Admin'}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function loadRoutes() {
  const { data } = await supabaseClient.from("routes").select("*, matatus(registration_number)");
  const container = document.getElementById("routes-table-container");
  if (!data) return;

  container.innerHTML = `
    <table>
      <thead>
        <tr><th>Vehicle</th><th>Route</th><th>Departure</th><th>Fare</th><th>Seats</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${data.map(r => `
          <tr>
            <td>${r.matatus ? r.matatus.registration_number : 'N/A'}</td>
            <td>${r.origin} ➔${r.destination}</td>
            <td>${new Date(r.departure_time).toLocaleString()}</td>
            <td>KES ${r.fare}</td>
            <td>${r.available_seats}</td>
            <td><button class="btn-danger" onclick="deleteRoute('${r.id}')">Delete</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function loadBookings() {
  const { data } = await supabaseClient.from("bookings").select("*, routes(origin, destination)");
  const container = document.getElementById("bookings-table-container");
  if (!data) return;

  container.innerHTML = `
    <table>
      <thead>
        <tr><th>Customer</th><th>Phone</th><th>Route</th><th>Seats</th><th>Amount</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${data.map(b => `
          <tr>
            <td>${b.customer_name}</td>
            <td>${b.customer_phone}</td>
            <td>${b.routes ? b.routes.origin + ' to ' + b.routes.destination : 'N/A'}</td>
            <td>${b.seats_booked}</td>
            <td>KES ${b.total_amount}</td>
            <td><span class="badge badge-completed">${b.payment_status}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function deleteMatatu(id) {
  if (confirm("Are you sure you want to delete this matatu/driver?")) {
    await supabaseClient.from("matatus").delete().eq("id", id);
    loadAllData();
  }
}

async function deleteRoute(id) {
  if (confirm("Delete this route?")) {
    await supabaseClient.from("routes").delete().eq("id", id);
    loadRoutes();
  }
}