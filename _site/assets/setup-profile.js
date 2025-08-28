// @ts-nocheck

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("profileForm");
  const message = document.getElementById("profileMessage");
  const welcome = document.getElementById("welcomeMessage");
  const confirmation = document.getElementById("confirmationMessage");

  const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
  if (userError || !user) {
    message.textContent = "You must be logged in to complete your profile.";
    form.style.display = "none";
    welcome.textContent = "Access Denied";
    confirmation.textContent = "";
    return;
  }

  // Personalize greeting
  const displayName = user.user_metadata?.username || user.email;
  welcome.textContent = `Welcome, ${displayName}!`;
  confirmation.textContent = `✅ Your email has been confirmed. Let’s complete your profile to unlock member access.`;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const first_name = form.first_name.value.trim();
    const last_name = form.last_name.value.trim();
    const username = form.username.value.trim();

    const MEMBER_PLAN_ID = "your-member-plan-uuid"; // Replace with actual UUID

    const { error } = await window.supabaseClient.from("profiles").insert({
      id: user.id,
      email: user.email,
      first_name,
      last_name,
      username,
      plan_id: MEMBER_PLAN_ID,
      status: "active",
      created_at: new Date().toISOString()
    });

    if (error) {
      message.textContent = error.message;
    } else {
      message.textContent = "Profile saved! Redirecting...";
      setTimeout(() => window.location.href = "/dashboard/", 1500);
    }
  });
});