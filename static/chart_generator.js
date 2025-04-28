var chart = LightweightCharts.createChart(document.getElementById("chart"), {
    width: 900,
    height: 450,
    layout: {
        backgroundColor: '#1e1e2e',
        textColor: '#ffffff',
        fontSize: 14,
    },
    grid: {
        vertLines: {
            color: '#1e1e2e',
        },
        horzLines: {
            color: '#1e1e2e',
        },
    },
    crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
        borderColor: 'rgba(42, 46, 57, 0.8)',
    },
    timeScale: {
        borderColor: 'rgba(42, 46, 57, 0.8)',
        timeVisible: true,
    },
});

// Add candlestick series
var candleSeries = chart.addCandlestickSeries({
    upColor: '#00A499',
    downColor: '#F85355',
    wickDownColor: '#F85355',
    wickUpColor: '#00A499',
});

// Set precision for prices
var candlestick = {};
candlestick.prec = 7;

candleSeries.applyOptions({
    priceFormat: {
        type: 'price',
        precision: candlestick.prec,
        minMove: 1 / 10 ** candlestick.prec,
    },
});

// Add volume series
var volumeSeries = chart.addHistogramSeries({
    color: 'rgba(0, 150, 136, 0.5)',
    priceFormat: {
        type: 'volume',
    },
    priceScaleId: '',
});

const interval = '1m';
const limit = 300;

var inputField = document.getElementById("tickers");
var binanceSocket2;

inputField.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
        if (binanceSocket2) {
            binanceSocket2.close();
            console.log("Closed previous WebSocket connection.");
        }
        var coin = inputField.value;
        let upperCoin = coin.toUpperCase();
        let lowerCoin = coin.toLowerCase();

        // Fetch initial candlestick data from the backend
        fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${upperCoin}&interval=1m&limit=300`)
        .then(response => {
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Fetched data:", data);

                // Ensure data is an array
                if (Array.isArray(data)) {
                    const candlestickData = data.map(innerList => ({
                        time: innerList[0] / 1000, // Convert milliseconds to seconds
                        open: parseFloat(innerList[1]),
                        high: parseFloat(innerList[2]),
                        low: parseFloat(innerList[3]),
                        close: parseFloat(innerList[4])
                    }));

                    candleSeries.setData(candlestickData);
                } else {
                    console.error("Unexpected data format:", data);
                }
            })
            .catch(error => console.error("Error fetching candlestick data:", error));

        // WebSocket for real-time updates
        binanceSocket2 = new WebSocket(`wss://fstream.binance.com/ws/${lowerCoin}@kline_1m`);
        
        binanceSocket2.onmessage = function(event) {
            var message = JSON.parse(event.data);
            var candlestick = message.k;

            console.log("Real-time candlestick data:", candlestick);

            candleSeries.update({
                time: candlestick.t / 1000, // Convert milliseconds to seconds
                open: parseFloat(candlestick.o),
                high: parseFloat(candlestick.h),
                low: parseFloat(candlestick.l),
                close: parseFloat(candlestick.c)
            });
        };

        binanceSocket2.onerror = function(error) {
            console.error("WebSocket error:", error);
        };
    }
});
