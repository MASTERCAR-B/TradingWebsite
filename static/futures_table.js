
var binanceSocket2;  
const priceLines = {}; // Object to store price line references
function updateChart(symbol) {
  // Close existing WebSocket connection
  if (binanceSocket2) {
      binanceSocket2.close();
      console.log("Closed previous WebSocket connection.");
  }

  const interval = '1m';
  const limit = 300;
  const upperSymbol = symbol.toUpperCase();
  const lowerSymbol = symbol.toLowerCase();

  // Fetch initial candlestick data
  fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${upperSymbol}USDT&interval=1m&limit=300`)
  .then(response => response.json())
      .then(data => {
          const candleData = data.map(innerList => ({
              time: innerList[0] / 1000,
              open: innerList[1],
              high: innerList[2],
              low: innerList[3],
              close: innerList[4]
          }));
          candleSeries.setData(candleData);
      });

  // Create new WebSocket connection
  binanceSocket2 = new WebSocket(`wss://fstream.binance.com/ws/${lowerSymbol}@kline_1m`);
  binanceSocket2.onmessage = function (event) {
      const message = JSON.parse(event.data);
      const candlestick = message.k;
      
      candleSeries.update({
          time: candlestick.t / 1000,
          open: candlestick.o,
          high: candlestick.h,
          low: candlestick.l,
          close: candlestick.c
      });
  };
}

// Function to create a price line on the chart
function addPriceLine(price, symbol, positionType) {
  const lineColor = positionType === 'long' ? '#008000' : '#FF0000'; // Green for long, Red for short
  const priceLine = candleSeries.createPriceLine({
      price: price,
      color: lineColor, // Set color based on position type
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Solid,
      axisLabelVisible: true,
      title: `Order @ ${price.toFixed(2)} (${symbol})`
  });

  // Store the price line reference using the symbol as key
  priceLines[symbol] = priceLine;
}

// Updated createOrUpdateRow function to include price line creation
function createOrUpdateRow(item) {
  const tableBody = document.getElementById("table-body");
  const existingRow = document.querySelector(`tr[data-symbol="${item.symbol}"]`);

  // If positionAmt is 0, remove the row and return immediately
  if (item.positionAmt === 0) {
      if (existingRow) {
          existingRow.remove();
      }
      return;
  }

  let row;

  if (!existingRow) {
      // Create a new row if it doesn't exist
      row = document.createElement("tr");
      row.setAttribute("data-symbol", item.symbol);

      // Symbol Cell (with color based on position type)
      const symbolCell = document.createElement("td");
      symbolCell.classList.add("symbol-cell");
      const symbolColorClass = item.notional > 0 ? "long" : "short";
      symbolCell.innerHTML = `<span class="symbol ${symbolColorClass}">${item.symbol}</span> <span class="leverage">${item.leverage}x</span>`;
      row.appendChild(symbolCell);

      // Add click event to the symbol
      const symbolText = symbolCell.querySelector(".symbol");
      symbolText.addEventListener("click", () => {
        updateChart(item.symbol.toUpperCase());
        addPriceLine(parseFloat(item.entryPrice), item.symbol, item.notional > 0 ? 'long' : 'short'); // Pass position type (long/short)
    });

      // Remaining cells (size, entry price, etc.)
      const sizeCell = document.createElement("td");
      sizeCell.classList.add("size-cell");
      sizeCell.textContent = `${item.notional} USDT`;
      row.appendChild(sizeCell);

      const entryPriceCell = document.createElement("td");
      entryPriceCell.classList.add("entry-price-cell");
      entryPriceCell.textContent = item.entryPrice;
      row.appendChild(entryPriceCell);

      const priceCell = document.createElement("td");
      priceCell.classList.add("price-cell");
      const currentPrice = parseFloat(item.entryPrice).toFixed(4);
      priceCell.innerHTML = `${currentPrice} USD`;
      row.appendChild(priceCell);

      const marginCell = document.createElement("td");
      marginCell.classList.add("margin-cell");
      const initialMargin = parseFloat(item.isolatedWallet).toFixed(3);
      marginCell.innerHTML = `${initialMargin} USDT`;
      row.appendChild(marginCell);

      const pnlCell = document.createElement("td");
      pnlCell.classList.add("pnl-cell");
      const profit = parseFloat(item.unrealizedProfit).toFixed(2);
      pnlCell.textContent = `${profit}`;
      pnlCell.classList.toggle("profit-positive", profit > 0);
      pnlCell.classList.toggle("profit-negative", profit < 0);
      row.appendChild(pnlCell);

      const closePositionCell = document.createElement("td");
      closePositionCell.classList.add("close-position-cell");
      const marketButton = document.createElement("button");
      marketButton.textContent = "Market";
      marketButton.classList.add("market-btn");
      marketButton.onclick = () => handleButtonClick(item);
      closePositionCell.appendChild(marketButton);
      row.appendChild(closePositionCell);

      tableBody.appendChild(row);
  } else {
      // Update existing row
      row = existingRow;

      const sizeCell = row.querySelector(".size-cell");
      sizeCell.textContent = `${item.notional} USDT`;

      const priceCell = row.querySelector(".price-cell");
      const currentPrice = parseFloat(item.entryPrice).toFixed(4);
      priceCell.innerHTML = `${currentPrice} USD`;

      const marginCell = row.querySelector(".margin-cell");
      const initialMargin = parseFloat(item.isolatedWallet).toFixed(3);
      marginCell.innerHTML = `${initialMargin} USDT`;

      const pnlCell = row.querySelector(".pnl-cell");
      const profit = parseFloat(item.unrealizedProfit).toFixed(2);
      pnlCell.textContent = `${profit}`;
      pnlCell.classList.toggle("profit-positive", profit > 0);
      pnlCell.classList.toggle("profit-negative", profit < 0);
  }
}

function handleButtonClick(item) {
  if (item.positionAmt !== 0) {
    closePosition(item.symbol);
  }
}

function handleReverseClick(item, inputPrice, inputAmount) {
  const price = inputPrice.value;
  const amount = inputAmount.value;

  if (!price || !amount) {
    console.error('Price and amount are required for reverse orders');
    return;
  }

  if (item.positionAmt > 0) {
    fetchData2(item.symbol, amount, price); // Close long position
  } else if (item.positionAmt < 0) {
    fetchData1(item.symbol, amount, price); // Close short position
  }
}

// Fetch and update positions every 1.5 seconds
setInterval(() => {
  fetch('/positions/', { method: 'GET' })
    .then(response => response.json())
    .then(list_of_stuff => {
      const currentSymbols = new Set(list_of_stuff.map(item => item.symbol));

      // Remove rows for positions that no longer exist
      const existingRows = document.querySelectorAll('#table-body tr[data-symbol]');
      existingRows.forEach(row => {
        const symbol = row.getAttribute('data-symbol');
        if (!currentSymbols.has(symbol)) {
          row.remove();

          // Remove the price line for the symbol if it exists
          if (priceLines[symbol]) {
            candleSeries.removePriceLine(priceLines[symbol]);
            delete priceLines[symbol]; // Clean up reference
          }
        }
      });

      // Update or create rows for current positions
      list_of_stuff.forEach(item => {
        createOrUpdateRow(item);
      });
    })
    .catch(console.error);
}, 2000);

// API calls for position management
function closePosition(symbol) {
  fetch('/close_position/', {
    method: 'POST',
    body: JSON.stringify({ symbol }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => response.json())
  .then(data => {
    console.log(data);

    // Remove the row immediately
    const row = document.querySelector(`tr[data-symbol="${symbol}"]`);
    if (row) {
      row.remove();
    }

    // Remove the price line if it exists
    if (priceLines[symbol]) {
      candleSeries.removePriceLine(priceLines[symbol]);
      delete priceLines[symbol]; // Delete the reference
    }
  })
  .catch(console.error);
}

function fetchData1(symbol, amount, price) {
  fetch('/close_short_limit_position/', {
    method: 'POST',
    body: JSON.stringify({ coin: symbol, amount, price }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(console.error);
}

function fetchData2(symbol, amount, price) {
  fetch('/close_long_limit_position/', {
    method: 'POST',
    body: JSON.stringify({ coin: symbol, amount, price }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(console.error);
}