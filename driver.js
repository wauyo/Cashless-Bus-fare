const SUPABASE_URL = "https://fcdoixlxylazmosevbtx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_M2NTtqT-2sMrlPSWF4embg_fbbzjvB1";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentDriver = null;

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("driver-email").value;
  const pin = document.getElementById("driver-pin").value;

  const { data, error } = await supabaseClient
    .from("matatus")
    .select("*")
    .eq("email", email)
    .eq("pin", pin)
    .single();

  if (error || !data) {
    alert("Invalid Email or PIN");
    return;
  }

  currentDriver = data;
  document.getElementById("login-card").style.display = "none";
  document.getElementById("driver-dashboard").style.display = "block";

  document.getElementById("prof-driver-name").value = data.driver_name || '';
  document.getElementById("prof-phone").value = data.phone_number || '';
  document.getElementById("prof-pin").value = data.pin;
});

document.getElementById("update-profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const driver_name = document.getElementById("prof-driver-name").value;
  const phone_number = document.getElementById("prof-phone").value;
  const pin = document.getElementById("prof-pin").value;

  const { error } = await supabaseClient
    .from("matatus")
    .update({ driver_name, phone_number, pin })
    .eq("id", currentDriver.id);

  if (!error) {
    alert("Credentials updated successfully!");
  } else {
    alert("Error updating credentials.");
  }
});

document.getElementById("add-route-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const origin = document.getElementById("route-origin").value;
  const destination = document.getElementById("route-dest").value;
  const departure_time = document.getElementById("route-time").value;
  const fare = parseFloat(document.getElementById("route-fare").value);
  const available_seats = parseInt(document.getElementById("route-seats").value);

  const { error } = await supabaseClient
    .from("routes")
    .insert([{
      matatu_id: currentDriver.id,
      origin,
      destination,
      departure_time,
      fare,
      available_seats
    }]);

  if (!error) {
    alert("Route posted successfully!");
    document.getElementById("add-route-form").reset();
  } else {
    alert("Failed to add route.");
  }
});