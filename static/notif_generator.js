// Control whether to connect to WebSockets
var connectToWebSockets = true; // Set to true to connect, false to skip connections

var tabsContainer = document.getElementById("tabs-container");
var binanceSocket2;  
var newsSockets = []; 

candlestick = {};
candlestick.prec = 7;

candleSeries.applyOptions({
    priceFormat: {
        type: 'price',
        precision: candlestick.prec,
        minMove: 1 / 10 ** candlestick.prec,
    }
});

var newsUrls = [
  "",   
  "", // Replace with your actual ws, format is "Tree format"     
];

function handleNews(event, source) {
    let obj = event.data;
    try {
        var dic = JSON.parse(obj);
    } catch(error) {
        console.error(error);
        console.log(`Received message: ` + event.data.toString());
        return;
    }
    
    if (dic.message && dic.message.includes("Logged in successfully")) {
        console.log(`WebSocket connected: ${source}`);
        showTemporaryNotification(`Connected to ${source}`, "green");
        return;
    }

    console.log(`Received from ${source}:`, dic);
    
    // Process the news with AI before displaying
    processAndDisplayNews(dic, source);
}

async function processAndDisplayNews(dic, source) {
    console.log(`Processing news: ${dic["title"]}`);
    
    try {
        // Prepare the data to send to the Python backend
        const newsData = {
            title: dic["title"] || "",
            body: dic["body"] || "",
            source: source || "Unknown",
            suggestions: dic["suggestions"] || [],
            found: dic["coin"] ? [dic["coin"]] : [] // Add any identified coins
        };
        
        // Call the Python backend endpoint for analysis
        const response = await fetch('/analyze_news', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newsData)
        });
        
        if (!response.ok) {
            throw new Error(`Server response: ${response.status}`);
        }
        
        const result = await response.json();
        const aiAnalysis = result.analysis || "Market impact likely neutral";
        
        console.log(`AI Analysis result: ${aiAnalysis}`);
        
        // Add AI analysis to the news data
        dic["aiAnalysis"] = aiAnalysis;
        
        // Continue with displaying the news with analysis
        displayNewsWithAnalysis(dic, source, aiAnalysis);
    } catch (error) {
        console.error("Error analyzing news:", error);
        // If the analysis fails, continue with neutral analysis
        displayNewsWithAnalysis(dic, source, "Market impact likely neutral");
    }
}

function displayNewsWithAnalysis(dic, source, aiAnalysis) {
    // Determine class based on AI analysis
    let analysisClass = "";
    if (aiAnalysis.includes("pump")) {
        analysisClass = "market-pump";
    } else if (aiAnalysis.includes("dump")) {
        analysisClass = "market-dump";
    } else {
        analysisClass = "market-neutral";
    }
    
    try {
        var coin_of_news = dic["coin"] || (dic["suggestions"] && dic["suggestions"][0]?.coin) || "BTC";

        var texttttt = document.createElement("span");
        texttttt.textContent = coin_of_news + "-USDT";
        texttttt.id = "texttttt";
        texttttt.style.display = "inline-block";
        texttttt.style.marginRight = "10px";

        const tab = document.createElement("div");
        tab.classList.add("tab");
        tab.classList.add(analysisClass); // Add class based on AI analysis
        tab.setAttribute('data-value', coin_of_news || "BTC");

        // Create content container for better layout control
        const contentContainer = document.createElement("div");
        contentContainer.className = "content-container";
        contentContainer.style.display = "flex";
        contentContainer.style.width = "100%";

        // Left side - icon and text content
        const leftContent = document.createElement("div");
        leftContent.className = "left-content";
        leftContent.style.flex = "1";
        leftContent.style.minWidth = "0"; // Prevents flex items from overflowing

        var tabImage = document.createElement('img');
        tabImage.src = dic["icon"];
        tabImage.classList.add("tab-image");

        if (tabImage.src == "http://43.207.178.138/undefined") {
            console.log("Image is Undefined");
            tabImage.src = "static/Master_terminal.png";
        }

        const tabTitle = document.createElement('h1');
        tabTitle.innerHTML = dic["title"];
        tabTitle.style.fontSize = '18px';
        tabTitle.style.width = "calc(100% - 70px)"; // Account for the image
        tabTitle.style.margin = "0 0 5px 70px";
        tabTitle.style.overflow = "hidden";
        tabTitle.style.textOverflow = "ellipsis";
        tabTitle.style.whiteSpace = "nowrap";

        var tabDescription = document.createElement('p');
        tabDescription.innerHTML = dic["body"];
        tabDescription.innerHTML = tabDescription.innerHTML.substring(0, 200);
        tabDescription.style.width = "calc(100% - 70px)";
        tabDescription.style.margin = "0 0 10px 70px";
        tabDescription.style.fontSize = "14px";
        tabDescription.style.lineHeight = "1.3";
        tabDescription.classList.add("tabDescription");

        if (tabDescription.innerHTML == "undefined") {
            console.log("No Description on the news");
            tabDescription.innerHTML = "";
        }

        // Add AI analysis indicator
        const aiIndicator = document.createElement('div');
        aiIndicator.style.marginLeft = "70px";
        aiIndicator.style.fontSize = "12px";
        aiIndicator.style.fontWeight = "bold";
        aiIndicator.style.padding = "2px 5px";
        aiIndicator.style.borderRadius = "3px";
        aiIndicator.style.display = "inline-block";
        aiIndicator.style.marginBottom = "5px";
        
        if (analysisClass === "market-pump") {
            aiIndicator.textContent = "🚀 " + aiAnalysis;
            aiIndicator.style.backgroundColor = "rgba(76, 175, 80, 0.2)";
            aiIndicator.style.color = "#4CAF50";
            aiIndicator.style.border = "1px solid #4CAF50";
        } else if (analysisClass === "market-dump") {
            aiIndicator.textContent = "📉 " + aiAnalysis;
            aiIndicator.style.backgroundColor = "rgba(244, 67, 54, 0.2)";
            aiIndicator.style.color = "#f44336";
            aiIndicator.style.border = "1px solid #f44336";
        } else {
            aiIndicator.textContent = "⚖️ " + aiAnalysis;
            aiIndicator.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            aiIndicator.style.color = "#cccccc";
            aiIndicator.style.border = "1px solid #cccccc";
        }

        // Right side - picture if available
        const rightContent = document.createElement("div");
        rightContent.className = "right-content";
        rightContent.style.marginLeft = "10px";
        rightContent.style.width = "80px";

        var tabPicture = document.createElement("img");
        if (dic["image"]) {
            tabPicture.src = dic["image"];
            tabPicture.classList.add("tab-picture");
            console.log("Image source:", tabPicture.src);
            
            tabPicture.onerror = function () {
                console.error("Image failed to load, not adding image.");
                tabPicture.remove();
            };
            
            rightContent.appendChild(tabPicture);
        } else {
            console.log("No image available, not adding image.");
        }

        // Apply styles based on content
        if (tabTitle.innerText.includes("方程式新闻 BWEnews 🏎️ (@bwenews)")) {
            // Add special neo rainbow effect for BWEnews
            tab.classList.add("neo-rainbow");
            
            // Play a different sound for BWEnews
            var bweAudio = new Audio('/static/race-car-sound.mp3');
            bweAudio.play().catch(error => console.error("Audio play error:", error));
        }
        else if (tabTitle.innerText.includes("Elon Musk") || tabTitle.innerText.includes("Donald J. Trump") || 
            tabTitle.innerText.includes("Salience") || tabTitle.innerText.includes("Brox")) {
            tab.classList.add("neon-blue");
        } else if (tabTitle.innerText.includes("CHAINWIRE") || tabTitle.innerText.includes("DECRYPT") || 
                   tabTitle.innerText.includes("FORTUNE") || tabTitle.innerText.includes("COINDESK")) {
            tab.classList.add("neon-orange");
        } else if (tabTitle.innerText.includes("ZEC")) {
            tab.classList.add("neon-purple");
        } else if (tabTitle.innerText.includes("Eugene") || tabTitle.innerText.includes("DEFI^2")) {
            tab.classList.add("neon-red");
        }

        if (tabDescription && tabDescription.innerText && 
            (tabDescription.innerText.includes("Partnership") || tabDescription.innerText.includes("Partnering") || 
             tabDescription.innerText.includes("Collaboration") || tabDescription.innerText.includes("Invests") || 
             tabDescription.innerText.includes("Roadmap"))) {
            tab.classList.add("rainbow-spin");
        }

        // Build left content section
        leftContent.appendChild(tabImage);
        leftContent.appendChild(tabTitle);
        leftContent.appendChild(aiIndicator); // Add AI analysis before description
        leftContent.appendChild(tabDescription);

        // Create buttons container with proper layout
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "buttons-container";
        buttonsContainer.style.display = "flex";
        buttonsContainer.style.flexDirection = "column";
        buttonsContainer.style.marginLeft = "70px";
        buttonsContainer.style.width = "calc(100% - 70px)";

        // First row of buttons (100s and 200s)
        const row1 = document.createElement("div");
        row1.style.display = "flex";
        row1.style.marginBottom = "5px";
        
        // Second row of buttons (300s)
        const row2 = document.createElement("div");
        row2.style.display = "flex";

        // Add trading buttons
        const buttons = [
            // First row - all green/long buttons
            { text: "300", id: "button1", action: "/button_long/", amount: 3000, type: "long", row: row1 },
            { text: "450", id: "button3", action: "/button_long/", amount: 4500, type: "long", row: row1 },
            { text: "2000", id: "button5", action: "/button_long/", amount: 10000, type: "long", row: row1 },
            // Second row - all red/short buttons
            { text: "300", id: "button2", action: "/button_short/", amount: 3000, type: "short", row: row2 },
            { text: "450", id: "button4", action: "/button_short/", amount: 4500, type: "short", row: row2 },
            { text: "1000", id: "button6", action: "/button_short/", amount: 10000, type: "short", row: row2 }
        ];

        buttons.forEach(function(buttonData) {
            var button = document.createElement("button");
            button.textContent = buttonData.text;
            button.id = buttonData.id;
            button.className = buttonData.type === "long" ? "long-button" : "short-button";
            
            // Apply transparent background with colored border
            button.style.background = "transparent";
            button.style.color = "white";
            button.style.border = buttonData.type === "long" ? "1px solid #4CAF50" : "1px solid #f44336"; // Green for long, red for short
            button.style.padding = "3px 8px";
            button.style.borderRadius = "3px";
            button.style.cursor = "pointer";
            button.style.fontSize = "12px";
            button.style.margin = "0 5px 0 0";
            button.style.minWidth = "50px";
            
            button.onclick = function() {
                fetch(buttonData.action, {
                    method: 'POST',
                    body: JSON.stringify({ "coin": (coin_of_news || "BTC") + "USDT", "amount": buttonData.amount }),
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(response => response.text())
                .then(data => {
                    console.log(data);
                });
            };
            
            buttonData.row.appendChild(button);
        });





        buttonsContainer.appendChild(row1);
        buttonsContainer.appendChild(row2);
        
        
        
        const discordButton = document.createElement("button");
        discordButton.textContent = "Discord";
        discordButton.className = "discord-button";
        discordButton.style.background = "transparent";
        discordButton.style.color = "white";
        discordButton.style.border = "1px solid #7289DA"; // Discord color
        discordButton.style.padding = "3px 8px";
        discordButton.style.borderRadius = "3px";
        discordButton.style.cursor = "pointer";
        discordButton.style.fontSize = "12px";
        discordButton.style.margin = "5px 5px 0 0";
        discordButton.style.minWidth = "70px";
        discordButton.style.position= "absolute";
        discordButton.style.right = "378px"; // Align to the right of the tab
        discordButton.style.top = "128px"; // Align to the top of the tab
        // Add coin info below buttons
        discordButton.onclick = function() {
            fetch("/send_discord/", {
                method: 'POST',
                body: JSON.stringify({ 
                    "title": dic["title"] || "",
                    "body": dic["body"] || ""
                }),
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.text())
            .then(data => {
                console.log("Discord notification sent:", data);
                showTemporaryNotification("Sent to Discord", "#7289DA");
            })
            .catch(error => {
                console.error("Error sending to Discord:", error);
                showTemporaryNotification("Failed to send to Discord", "red");
            });
        };
    
        // Create a separate row for the Discord button
        const discordRow = document.createElement("div");
        discordRow.style.display = "flex";
        discordRow.style.marginTop = "5px";
        discordRow.appendChild(discordButton);
    
        // Add the Discord button row to the buttons container
        buttonsContainer.appendChild(discordRow);


        const textContainer = document.createElement("div");
        textContainer.style.display = "flex";
        textContainer.style.alignItems = "center";
        textContainer.style.marginTop = "5px";
        textContainer.style.marginLeft = "70px";
        textContainer.append(texttttt);
        
        // Put it all together
        leftContent.appendChild(buttonsContainer);
        leftContent.appendChild(textContainer);
        
        contentContainer.appendChild(leftContent);
        contentContainer.appendChild(rightContent);
        tab.appendChild(contentContainer);
        
        // Apply special border for urgent news
        applyNeonBorder(tab, ["urgent", "alert", "special", "breaking"]);
        
        // Add special styling for AI analysis results
        if (analysisClass === "market-pump") {
            tab.style.borderLeft = "4px solid #4CAF50";
        } else if (analysisClass === "market-dump") {
            tab.style.borderLeft = "4px solid #f44336";
        }

        // Insert tab at the beginning of the container
        tabsContainer.insertBefore(tab, tabsContainer.firstChild);
        
        // Play notification sound for normal news
        if (!tabTitle.innerText.includes("方程式新闻 BWEnews 🏎️ (@bwenews)")) {
            var audio = new Audio('/static/ding-126626.mp3');
            audio.play().catch(error => console.error("Audio play error:", error));
        }
        
        // Apply golden aura effect
        tab.style.boxShadow = "0px 0px 15px 5px gold";
        tab.style.transition = "box-shadow 1s ease-in-out";
        
        // Remove effect after 1 second
        setTimeout(() => {
            tab.style.boxShadow = "none";
        }, 1000);

        // Add click handler for chart updates
        tab.addEventListener('click', () => {
            const value = tab.getAttribute('data-value');
            console.log("Selected tab value:", value);
    
            const lower_coin = value.toLowerCase();
            const upperCoin = value.toUpperCase();
    
            // Close existing WebSocket connection
            if (binanceSocket2) {
                binanceSocket2.close();
                console.log("Closed previous WebSocket connection.");
            }
    
            // Fetch initial candlestick data
            fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${upperCoin}USDT&interval=1m&limit=300`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Server error: ${response.status}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log("Fetched initial data for chart:", data);
    
                    if (Array.isArray(data)) {
                        const candleData = data.map((innerList) => ({
                            time: innerList[0] / 1000,
                            open: parseFloat(innerList[1]),
                            high: parseFloat(innerList[2]),
                            low: parseFloat(innerList[3]),
                            close: parseFloat(innerList[4])
                        }));
    
                        candleSeries.setData(candleData);
                    } else {
                        console.error("Unexpected data format:", data);
                    }
                })
                .catch((error) => console.error("Error fetching candlestick data:", error));
    
            // Setup WebSocket for real-time updates
            binanceSocket2 = new WebSocket(`wss://fstream.binance.com/ws/${lower_coin}usdt@kline_1m`);
    
            binanceSocket2.onopen = function() {
                console.log(`WebSocket connected for ${upperCoin}USDT`);
            };
    
            binanceSocket2.onmessage = function(event) {
                try {
                    var message = JSON.parse(event.data);
                    
                    if (message.e === 'kline') {
                        var candlestick = message.k;
                        console.log("Real-time candlestick data:", candlestick);
        
                        candleSeries.update({
                            time: candlestick.t / 1000,
                            open: parseFloat(candlestick.o),
                            high: parseFloat(candlestick.h),
                            low: parseFloat(candlestick.l),
                            close: parseFloat(candlestick.c)
                        });
                    }
                } catch (error) {
                    console.error("Error processing WebSocket message:", error);
                }
            };
    
            binanceSocket2.onerror = function(error) {
                console.error("WebSocket error:", error);
            };
    
            binanceSocket2.onclose = function() {
                console.log(`WebSocket closed for ${upperCoin}USDT`);
            };
        });

    } catch (error) {
        console.error("Error in displayNewsWithAnalysis:", error);
    }
}

// Add CSS for the new AI analysis styles
function addAIAnalysisStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .market-pump {
            background: linear-gradient(to right, rgba(76, 175, 80, 0.1), transparent 20%);
        }
        
        .market-dump {
            background: linear-gradient(to right, rgba(244, 67, 54, 0.1), transparent 20%);
        }
        
        .market-neutral {
            /* No special styling for neutral market impact */
        }
    `;
    document.head.appendChild(styleElement);
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    addAIAnalysisStyles();
});

function showTemporaryNotification(message, color) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.right = '10px';
    notification.style.backgroundColor = color || 'green';
    notification.style.color = 'white';
    notification.style.padding = '5px 10px';
    notification.style.borderRadius = '3px';
    notification.style.zIndex = '1000';
    notification.style.fontSize = '12px';
    notification.style.opacity = '0.9';
    notification.style.maxWidth = '200px';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
}

function initializeNewsSocket(url) {
    if (!connectToWebSockets) {
        console.log(`Skipping WebSocket connection for ${url}`);
        return;
    }

    const existingSocketIndex = newsSockets.findIndex(s => s._url === url);
    if (existingSocketIndex !== -1) {
        newsSockets.splice(existingSocketIndex, 1);
    }

    var newsSocket = new WebSocket(url);
    newsSocket._url = url;
    
    newsSocket.onopen = function() {
        var apiKey = ""; //replace with your actual password
        var loginMessage = "login " + apiKey; //replace with your actual way of auth for the ws
        newsSocket.send(loginMessage);  
        console.log(`WebSocket opened for ${url}`);
    };
    
    newsSocket.onmessage = function(event) {
        handleNews(event, url);
    };
    
    newsSocket.onerror = function(error) {
        console.log(`WebSocket error from ${url}:`, error);
    };
    
    newsSocket.onclose = function() {
        console.log(`WebSocket connection closed for ${url}`);
        setTimeout(() => initializeNewsSocket(url), 1000);
    };
    
    newsSockets.push(newsSocket);
}

if (connectToWebSockets) {
    newsUrls.forEach(url => initializeNewsSocket(url));
} else {
    console.log("WebSocket connections are disabled.");
}

function sendMockNews() {
    const mockEvent = {
        data: JSON.stringify({
            title: "Elon Musk (@elonmusk)",
            body: "elonmusk retweeted @TiceRichard\nQuote @TiceRichard\n> Big day today, it's PMQs…\n> \n> It's time to for the Prime Minister to clear one or two things up! 👇👇",
            icon: "https://pbs.twimg.com/profile_images/1874558173962481664/8HSTqIlD.jpg",
            coin: "DOGE",
            image: "https://pbs.twimg.com/amplify_video_thumb/1876910068429385728/img/8Vfqezz0CuMFdjig.jpg",
            link: "https://twitter.com/elonmusk/status/1876999064216064493",
            video: "https://video.twimg.com/amplify_video/1876910068429385728/vid/avc1/476x270/K7-H9t7jODhxu-yQ.mp4?tag=16",
            requireInteraction: true,
        }),
    };

    handleNews(mockEvent, "TwitterFeed");
}

// Trigger mock news for testing
if (!connectToWebSockets) {
    console.log("WebSocket connections are disabled. Sending mock news for testing...");
    sendMockNews();
}

function applyNeonBorder(tabElement, keywords) {
    const tabContent = tabElement.textContent.toLowerCase();
    let neonColor = null;

    keywords.forEach(keyword => {
        if (tabContent.includes(keyword.toLowerCase())) {
            if (keyword === "urgent") neonColor = "#ff0000"; // Red for urgent
            if (keyword === "alert") neonColor = "#ff8c00"; // Orange for alert
            if (keyword === "special") neonColor = "#00ff00"; // Green for special
            if (keyword === "breaking") neonColor = "#0ff"; // Cyan for breaking
        }
    });

    if (neonColor) {
        tabElement.style.border = `2px solid ${neonColor}`;
        tabElement.style.boxShadow = `0 0 10px ${neonColor}, 0 0 20px ${neonColor}, 0 0 30px ${neonColor}`;
    } else {
        tabElement.style.border = "";
        tabElement.style.boxShadow = "";
    }
}