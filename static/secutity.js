        // Security authentication script
        const correctPassword = ""; // Change this to your desired password
        let attemptCount = 0;
        const maxAttempts = 3;
        
        const securityOverlay = document.getElementById('security-overlay');
        const passwordInput = document.getElementById('password-input');
        const loginButton = document.getElementById('login-button');
        const attemptsMessage = document.getElementById('attempts-message');
        const appContent = document.getElementById('app-content');
        
        // Function to check password
        function checkPassword() {
            const enteredPassword = passwordInput.value;
            
            if (enteredPassword === correctPassword) {
                // Password correct - hide the overlay and load the app
                securityOverlay.style.display = 'none';
                loadApplication();
            } else {
                // Password incorrect
                attemptCount++;
                const attemptsLeft = maxAttempts - attemptCount;
                
                if (attemptsLeft > 0) {
                    // Still have attempts left
                    attemptsMessage.textContent = `Incorrect password. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`;
                    passwordInput.value = '';
                    passwordInput.focus();
                } else {
                    // No attempts left - shut down server
                    shutdownServer();
                }
            }
        }
        
        // Function to load the application only after successful authentication
        function loadApplication() {
            // Show the app container
            appContent.style.display = 'block';
            
            // Load required scripts dynamically
            loadScript('static/lightweight-charts.standalone.production.js', function() {
                // Load HTML content
                appContent.innerHTML = `
                    <!-- Small button at the top left -->
                    <button class="top-left-button" onclick="swapViews()">Swap View</button>

                    <!-- Your other HTML content remains here -->
                    <div id="header">
                        <u><h1>Chart of BTCUSDT 1m</h1></u>
                        <input type="text" id="tickers" placeholder="BTCUSDT">
                        
                        <div id="header-buttons">
                            <button class="button green" data-action="buy" data-amount="3000">300</button>
                            <button class="button green" data-action="buy" data-amount="6000">600</button>
                            <button class="button green" data-action="buy" data-amount="10000">1000</button>
                            <button class="button red" data-action="short" data-amount="3000">300</button>
                            <button class="button red" data-action="short" data-amount="6000">600</button>
                            <button class="button red" data-action="short" data-amount="10000">1000</button>
                        </div>
                        <div id="chart"></div>
                    </div>
                    
                    <div class="terminal"></div>

                    <div id="tabs-container">
                        <div id="tooltip"></div>  
                    </div>

                    <div class="positions-container">
                        <div class="positions-box">
                            <div class="tabs">
                                <div class="tab-item active">Futures</div>
                                <div class="tab-item">Positions</div>
                                <div class="tab-item">Spot</div>
                            </div>
                    
                            <div class="positions-table-container">
                                <table class="positions-table">
                                    <thead>
                                        <tr>
                                            <th class="column-header">Symbol</th>
                                            <th class="column-header">Size</th>
                                            <th class="column-header">Entry Price</th>
                                            <th class="column-header">Price</th>
                                            <th class="column-header">Margin</th>
                                            <th class="column-header">PNL</th>
                                            <th class="column-header">Close All Positions</th>
                                            <th class="column-header">Reverse</th>
                                        </tr>
                                    </thead>
                                    <tbody id="table-body">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div id="balance-display" style="position: absolute; top: 20px; left: 1077px; padding: 8px 12px; background-color: #333; color: white; border-radius: 5px; font-family: monospace; font-size: 14px;">
                        Balance: <span id="balance-amount">loading...</span> USDT
                    </div>
                `;
                
                // Now load the dependent scripts in the correct order
                loadScript('static/button_handler.js', function() {
                    loadScript('static/chart_generator.js', function() {
                        loadScript('static/notif_generator.js', function() {
                            loadScript('static/futures_table.js', function() {
                                loadScript('static/balance_updater.js', function() {
                                    console.log('All scripts loaded successfully');
                                });
                            });
                        });
                    });
                });
            });
        }
        
        // Helper function to load scripts dynamically
        function loadScript(src, callback) {
            const script = document.createElement('script');
            script.src = src;
            script.onload = callback;
            script.onerror = function() {
                console.error('Failed to load script: ' + src);
            };
            document.body.appendChild(script);
        }
        
        // Function to shut down the server by terminating run_me.py
        function shutdownServer() {
            // Visual feedback that server is shutting down
            const securityBox = document.getElementById('security-box');
            securityBox.innerHTML = '<div class="shutdown">SECURITY BREACH DETECTED</div><div class="shutdown">SERVER SHUTTING DOWN</div>';
            
            // Make a request to a specific endpoint that will terminate the run_me.py process
            fetch('/shutdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    reason: 'Security breach - multiple failed login attempts' 
                })
            })
            .then(response => {
                if (response.ok) {
                    securityBox.innerHTML += '<div style="margin-top: 20px; font-size: 16px;">Server has been shut down successfully.</div>';
                } else {
                    securityBox.innerHTML += '<div style="margin-top: 20px; font-size: 16px;">Error shutting down the server.</div>';
                }
            })
            .catch(error => {
                // This may not execute if server is already down
                console.error('Error:', error);
            });
        }
        
        // Function to swap views by changing positions - will be available after login
        function swapViews() {
            // Swap header-buttons margin-left position
            const headerButtons = document.querySelector('#header-buttons');
            headerButtons.style.marginLeft = (headerButtons.style.marginLeft === '1250px') ? '405px' : '1250px';

            // Swap tabs container left position
            const tabsContainer = document.querySelector('#tabs-container');
            tabsContainer.style.left = (tabsContainer.style.left === '58px') ? '1078px' : '58px';

            // Swap tv-lightweight-charts left position
            const chart = document.querySelector('.tv-lightweight-charts');
            chart.style.left = (chart.style.left === '899px') ? '56px' : '899px';

            // Swap positions box margin-left position
            const positionsBox = document.querySelector('.positions-box');
            positionsBox.style.marginLeft = (positionsBox.style.marginLeft === '877px') ? '45px' : '877px';

            // Swap h1 padding-left position
            const headerTitle = document.querySelector('#header h1');
            headerTitle.style.paddingLeft = (headerTitle.style.paddingLeft === '899px') ? '58px' : '899px';

            // Swap #tickers margin-left position
            const tickers = document.querySelector('#tickers');
            tickers.style.marginLeft = (tickers.style.marginLeft === '1031px') ? '191px' : '1031px';

            // Swap balance display position correctly
            const balanceDisplay = document.getElementById("balance-display");
            const currentLeft = window.getComputedStyle(balanceDisplay).left; // Get actual left value from CSS

            if (currentLeft === "1077px") {
                balanceDisplay.style.left = "57px";
                balanceDisplay.style.top = "20px";
            } else {
                balanceDisplay.style.left = "1077px";
                balanceDisplay.style.top = "20px";
            }
        }
        
        // Event listeners
        loginButton.addEventListener('click', checkPassword);
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
        
        // Focus the password input field when the page loads
        window.addEventListener('load', function() {
            passwordInput.focus();
        });
