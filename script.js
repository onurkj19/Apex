document.getElementById("contact-form").addEventListener("submit", async function (event) {
    event.preventDefault();
  
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;
    const responseMessage = document.getElementById("response-message");
  
    try {
      const response = await fetch("/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      });
  
      if (response.ok) {
        responseMessage.textContent = "Ihre Nachricht wurde erfolgreich gesendet!";
        responseMessage.style.color = "green";
        document.getElementById("contact-form").reset();
      } else {
        responseMessage.textContent = "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.";
        responseMessage.style.color = "red";
      }
    } catch (error) {
      console.error("Fehler beim Senden:", error);
      responseMessage.textContent = "Ein unerwarteter Fehler ist aufgetreten.";
      responseMessage.style.color = "red";
    }
  });
  




/* Toggle between showing and hiding the navigation menu links when the user clicks on the hamburger menu / bar icon */
function myFunction() {
    var x = document.getElementById("myLinks");
    if (x.style.display === "block") {
      x.style.display = "none";
    } else {
      x.style.display = "block";
    }
  }
