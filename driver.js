const SUPABASE_URL = "https://fcdoixlxylazmosevbtx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_M2NTtqT-2sMrlPSWF4embg_fbbzjvB1";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentDriver = null;

document.getElementById("driver-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("d-email").value;
  const pin = document.getElementById("d-pin").value;

  const { data, error } = await supabaseClient
    .from("matatus")
    .select("*")
    .eq("email", email)
    .eq("pin", pin)
    .single();

  if (error || !data) {
    alert("Invalid credentials.");
    return;
  }

  currentDriver = data;
  document.getElementById("login-card").style.display = "none";
  document.getElementById("driver-dash").style.display = "block";

  document.getElementById("p-name").value = data.driver_name || "";
  document.getElementById("p-phone").value = data.phone_number || "";
  document.getElementById("p-pin").value = data.pin;
});

document.getElementById("driver-profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const driver_name = document.getElementById("p-name").value;
  const phone_number = document.getElementById("p-phone").value;
  const pin = document.getElementById("p-pin").value;

  const { error } = await supabaseClient
    .from("matatus")
    .update({ driver_name, phone_number, pin })
    .eq("id", currentDriver.id);

  if (!error) alert("Profile updated!");
  else alert("Error updating profile.");
});

document.getElementById("add-route-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient
    .from("routes")
    .insert([{
      matatu_id: currentDriver.id,
      origin: document.getElementById("r-origin").value,
      destination: document.getElementById("r-dest").value,
      departure_time: document.getElementById("r-time").value,
      fare: parseFloat(document.getElementById("r-fare").value),
      available_seats: parseInt(document.getElementById("r-seats").value)
    }]);

  if (!error) {
    alert("Route added!");
    document.getElementById("add-route-form").reset();
  } else {
    alert("Failed to add route.");
  }
});