// balance_updater.js - Simple script to update the balance display

// Function to fetch and update the balance
function updateBalance() {
    // Get the balance amount element
    const balanceElement = document.getElementById('balance-amount');
    
    // Show loading state
    balanceElement.textContent = "loading...";
    
    // Fetch the balance from the server
    fetch('/balance/', {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        return response.text(); // Your endpoint returns plain text
    })
    .then(balance => {
        // Convert to number and format
        const numBalance = parseFloat(balance);
        const formattedBalance = numBalance.toFixed(2); // Display with 2 decimal places
        
        // Update the balance display
        balanceElement.textContent = formattedBalance;
        console.log("Balance updated:", formattedBalance);
    })
    .catch(error => {
        // Show error in the balance display
        balanceElement.textContent = "error";
        console.error("Error fetching balance:", error);
    });
}

// Set up periodic balance updates
function setupBalanceUpdates(intervalMs = 30000) {
    // Update immediately
    updateBalance();
    
    // Then update periodically
    setInterval(updateBalance, intervalMs);
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set up balance updates every 30 seconds
    setupBalanceUpdates(30000);
});

// Start updating right away if the document is already loaded
if (document.readyState === 'complete' || 
    document.readyState === 'interactive') {
    updateBalance();
}