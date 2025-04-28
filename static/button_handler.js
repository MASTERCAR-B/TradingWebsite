// Get the ticker input and all buttons
const tickerInput = document.getElementById("tickers");
const buttons = document.querySelectorAll("#header-buttons .button");

// Add event listeners to all buttons
buttons.forEach((button) => {
    button.addEventListener("click", () => {
        const action = button.getAttribute("data-action"); // 'buy' or 'short'
        const amount = button.getAttribute("data-amount"); // Amount from the button
        const ticker = tickerInput.value.trim().toUpperCase(); // Ticker from input

        if (!ticker) {
            alert("Please enter a valid ticker symbol.");
            return;
        }

        // Determine the endpoint based on the action
        const endpoint = action === "buy" ? "/button_long/" : "/button_short/";

        // Send the fetch request
        fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                coin: ticker,
                amount: parseInt(amount), // Convert the amount to a number
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                console.log(`${action.toUpperCase()} action sent for ${ticker} with amount ${amount}:`, data);
                showTemporaryNotification(
                    `${action.toUpperCase()} order placed for ${ticker} (${amount})`,
                    action === "buy" ? "green" : "red"
                );
            })
            .catch((error) => {
                console.error("Error:", error);
                showTemporaryNotification("Failed to place order.", "gray");
            });
    });
});

// Temporary notification function
function showTemporaryNotification(message, color) {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.top = "10px";
    notification.style.right = "10px";
    notification.style.backgroundColor = color || "green";
    notification.style.color = "white";
    notification.style.padding = "10px";
    notification.style.borderRadius = "5px";
    notification.style.zIndex = "1000";
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
}
