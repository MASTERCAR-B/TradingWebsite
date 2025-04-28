from binance.client import Client
import requests
from flask import Flask, render_template, request, jsonify, session
import time
import datetime
from datetime import datetime
import time
import threading
from flask import Flask, jsonify
from google import genai
import sys
import hashlib
import os
import json
import signal
import secrets
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import discord
from discord.ext import commands
import asyncio
BOT_TOKEN = ""  # Replace with your actual bot token# Set your API keys and Discord bot token
USER_IDS = ["", "", ""]  # Replace with actual Discord user IDs to ping when theres a big news
CHANNEL_ID = ""  # Replace with your actual channel ID

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)
GEMINI_API_KEY = ""
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

discord_bot_loop = asyncio.new_event_loop()

app = Flask(__name__)

app.secret_key = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(16))


# Setup rate limiter
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"])

# Generate a secure random salt
SALT = secrets.token_hex(16)  # Secure random salt
print(SALT)

# Store the salted and hashed password
# You can generate this with:
# hashlib.sha256((SALT + "your_password_here").encode()).hexdigest()

STORED_PASSWORD_HASH = hashlib.sha256((SALT + "Password_1234567890").encode()).hexdigest()



print(STORED_PASSWORD_HASH)
# Track failed attempts by IP address
failed_attempts = {}
# IP lockout time in seconds (10 minutes)
LOCKOUT_TIME = 600
# Max number of failed attempts before lockout
MAX_ATTEMPTS = 5

PREFIXED_SYMBOLS = {
    "BONKUSDT": "1000BONKUSDT",
    "SHIBUSDT": "1000SHIBUSDT",
    "XECUSDT": "1000XECUSDT",
    "LUNCUSDT": "1000LUNCUSDT",
    "PEPEUSDT": "1000PEPEUSDT",
    "FLOKIUSDT": "1000FLOKIUSDT",
    "SATSUSDT": "1000SATSUSDT",
    "RATSUSDT": "1000RATSUSDT",
    "SHIBUSDC": "1000SHIBUSDC",
    "BONKUSDC": "1000BONKUSDC",
    "CATUSDT": "1000CATUSDT",
    "MOGUSDT": "1000000MOGUSDT",  # Special case for larger prefix
    "CHEEMSUSDT": "1000CHEEMSUSDT",
}

binance_client = Client("", "") #replace with your actual api keys (binance)
binance_client.get_server_time()  # This will check if the time is synchronized





@app.route('/verify-password', methods=['POST'])
@limiter.exempt  # This exempts this route from rate limiting
@limiter.limit("3 per minute")  # Rate limit to 3 attempts per minute
def verify_password():
    client_ip = get_remote_address()
    
    # Check if IP is locked out
    if client_ip in failed_attempts:
        lockout_info = failed_attempts[client_ip]
        if lockout_info['count'] >= MAX_ATTEMPTS:
            time_passed = time.time() - lockout_info['timestamp']
            if time_passed < LOCKOUT_TIME:
                remaining = int(LOCKOUT_TIME - time_passed)
                return jsonify({
                    "success": False, 
                    "locked": True,
                    "message": f"Too many failed attempts. Try again in {remaining} seconds.",
                    "remainingTime": remaining
                }), 429
            else:
                # Reset counter if lockout period has passed
                failed_attempts[client_ip] = {'count': 0, 'timestamp': time.time()}
    
    data = request.json
    password_attempt = data.get('password', '')
    print(password_attempt)
    # Hash the attempted password with the salt
    attempt_hash = hashlib.sha256((SALT + password_attempt).encode()).hexdigest()

    print(attempt_hash)


    print(STORED_PASSWORD_HASH)
    # Compare with stored hash
    if attempt_hash == STORED_PASSWORD_HASH:
        # Successful login - reset failed attempts
        if client_ip in failed_attempts:
            del failed_attempts[client_ip]
        
        # Generate a session token for the user
        session['authenticated'] = True
        session['auth_token'] = secrets.token_hex(16)
        
        return jsonify({
            "success": True, 
            "token": session['auth_token']
        })
    else:
        # Failed login - increment counter
        if client_ip in failed_attempts:
            failed_attempts[client_ip]['count'] += 1
            failed_attempts[client_ip]['timestamp'] = time.time()
        else:
            failed_attempts[client_ip] = {'count': 1, 'timestamp': time.time()}
        
        attempts_left = MAX_ATTEMPTS - failed_attempts[client_ip]['count']
        
        return jsonify({
            "success": False,
            "message": f"Incorrect password. {attempts_left} attempts remaining before lockout."
        })

@app.route('/api/content', methods=['GET'])
@limiter.exempt  # This exempts this route from rate limiting
def get_content():
    # Check if user is authenticated
    if not session.get('authenticated', False):
        return jsonify({"error": "Unauthorized"}), 401
    
    # Return protected content
    return jsonify({"content": "Protected content here"})

@app.route('/shutdown', methods=['POST'])
@limiter.exempt  # This exempts this route from rate limiting
def shutdown():
    # Check if user is authenticated
    if not session.get('authenticated', False):
        return jsonify({"error": "Unauthorized"}), 401
        
    # Implement secure shutdown logic here
    return jsonify({"success": True, "message": "Server shutdown initiated"})

# Clear old lockouts periodically
@app.before_request
def cleanup_lockouts():
    current_time = time.time()
    to_delete = []
    for ip, info in failed_attempts.items():
        if current_time - info['timestamp'] > LOCKOUT_TIME:
            to_delete.append(ip)
    
    for ip in to_delete:
        del failed_attempts[ip]













@app.route('/')
def index():
  return render_template('Main_HTML_file.html')







@bot.event
async def on_ready():
    print(f'Bot logged in as {bot.user.name}')

def run_discord_bot():
    asyncio.set_event_loop(discord_bot_loop)
    discord_bot_loop.run_until_complete(bot.start(BOT_TOKEN))

# Start the bot in a separate thread
bot_thread = threading.Thread(target=run_discord_bot, daemon=True)
bot_thread.start()

@app.route('/send_discord/', methods=['POST'])
def send_discord():
    try:
        # Get data from request
        data = request.get_json()
        
        if not data or 'title' not in data or 'body' not in data:
            return jsonify({"status": "error", "message": "Missing required fields"}), 400
        
        title = data['title']
        body = data['body']
        
        # Use asyncio to send message through the bot
        async def send_message():
            try:
                channel = bot.get_channel(CHANNEL_ID)
                if not channel:
                    print(f"Could not find channel with ID {CHANNEL_ID}")
                    return False
                
                # Create user mentions for the ping
                user_mentions = " ".join([f"<@{user_id}>" for user_id in USER_IDS])
                
                # Create an embed
                embed = discord.Embed(
                    title=title,
                    description=body,
                    color=discord.Color.blue(),
                )
                embed.set_footer(text="Sent from Market News Terminal")
                
                # Send the message with user mentions and embed
                await channel.send(f"**Market Alert!** {user_mentions}", embed=embed)
                return True
            except Exception as e:
                print(f"Error sending Discord message: {str(e)}")
                return False
        
        # Run the async function in the bot's event loop
        future = asyncio.run_coroutine_threadsafe(send_message(), discord_bot_loop)
        success = future.result(timeout=10)  # Wait up to 10 seconds for result
        
        if success:
            return jsonify({"status": "success", "message": "Sent to Discord successfully"}), 200
        else:
            return jsonify({"status": "error", "message": "Failed to send Discord message"}), 500
    
    except Exception as e:
        print(f"Error processing Discord request: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500








@app.route('/spot_buy/', methods=['POST'])
@limiter.exempt  # This exempts this route from rate limiting
def spot_buy():
    data = request.get_json()
    print(data)

    coin = data["coin"]
    
    # Validate amount
    amount_str = data.get("amount", "")
    if not amount_str or not amount_str.replace('.', '', 1).isdigit():  # Check if amount is valid (can be a float)
        return "Invalid amount", 400  # Return an error message and a 400 Bad Request response

    amount = float(amount_str)

    # Validate price
    price_str = data.get("price", "")
    if not price_str or not price_str.replace('.', '', 1).isdigit():  # Check if price is valid (can be a float)
        return "Invalid price", 400  # Return an error message and a 400 Bad Request response

    price = float(price_str)

    print("Received project filepath:", coin, " ", amount, " ", price)

    # Create the order
    try:
        order = binance_client.order_limit_buy(symbol=coin, quantity=amount, price=price)
        print(order)
        return "Data received"
    except Exception as e:
        return f"Error creating order: {str(e)}", 500  # Return error if something goes wrong

@app.route('/binance-klines', methods=['GET'])
@limiter.exempt  # This exempts this route from rate limiting
def binance_klines():
    symbol = request.args.get('symbol')
    interval = request.args.get('interval', '1m')  # Default interval is 1m
    limit = request.args.get('limit', 300)  # Default limit is 300

    url = f'https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}'
    response = requests.get(url)
    return jsonify(response.json())

@app.route('/spot_sell/', methods=['POST'])
@limiter.exempt  # This exempts this route from rate limiting
def spot_sell():
    data = request.get_json()
    print(data)
    coin = data["coin"]
    amount = float(data["amount"])
    price = data["price"]
    print("Received project filepath:", coin, " ", amount, " ", price)
    order = binance_client.order_limit_sell(symbol=coin, quantity=amount, price=price)
    print(order)
    return "Data received"

@app.route("/close_position/", methods=["POST"])
@limiter.exempt  # This exempts this route from rate limiting
def close_position():
    try:
        data = request.json
        symbol = data['symbol']  # Get the symbol from the request

        # Fetch position information for the given symbol
        positions = binance_client.futures_position_information(symbol=symbol)
        position = next((pos for pos in positions if pos['symbol'] == symbol), None)

        if position:
            position_amt = float(position['positionAmt'])
            if position_amt != 0:
                # Determine whether to buy or sell based on the position size
                close_side = 'SELL' if position_amt > 0 else 'BUY'
                quantity = abs(position_amt)

                # Create a market order to close the position
                close_order = binance_client.futures_create_order(
                    symbol=symbol,
                    side=close_side,
                    type='MARKET',
                    quantity=quantity
                )
                return jsonify({"message": f"Closed position for {symbol}", "order": close_order})
            else:
                return jsonify({"message": "No open position for this symbol."})
        else:
            return jsonify({"message": f"No position found for symbol {symbol}."})

    except Exception as e:
        return jsonify({"error": str(e)})


def get_prefixed_symbol(raw_coin):
    # Special case for LUNAUSDT
    if raw_coin == "LUNAUSDT":
        return "LUNA2USDT"
    
    # Handle "1000" prefixed symbols
    coins_with_prefix = [
        "SHIBUSDT", "XECUSDT", "LUNCUSDT", "PEPEUSDT", "FLOKIUSDT", "BONKUSDT",
        "SATSUSDT", "RATSUSDT", "CATUSDT", "MOGUSDT", "XUSDT", "CHEEMSUSDT", "WHYUSDT"
    ]
    if raw_coin in coins_with_prefix:
        return f"1000{raw_coin}"
    
    # If no special case applies, return the raw coin
    return raw_coin



@app.route('/futures_buy/', methods=['POST'])
@limiter.exempt  # This exempts this route from rate limiting
def futures_buy():
    data = request.get_json()
    print(data)

    # Normalize coin symbol
    raw_coin = data["coin"].upper()
    coin = get_prefixed_symbol(raw_coin)

    amount = float(data["amount"]) if "amount" in data else None
    price = data.get("price")
    leverage = 6  # Default leverage

    # Set leverage and margin type
    binance_client.futures_change_leverage(symbol=coin, leverage=leverage)
    try:
        binance_client.futures_change_margin_type(symbol=coin, marginType='ISOLATED')
    except Exception as e:
        print(f"Margin type already set or error: {e}")

    # Fetch symbol info
    exchange_info = binance_client.futures_exchange_info()
    symbol_info = next((s for s in exchange_info['symbols'] if s['symbol'] == coin), None)
    if not symbol_info:
        raise ValueError(f"Invalid symbol: {coin}")

    quantity_precision = symbol_info['quantityPrecision']
    price_precision = symbol_info['pricePrecision']
    tick_size = next(float(f['tickSize']) for f in symbol_info['filters'] if f['filterType'] == 'PRICE_FILTER')

    # Get current ticker price
    ticker = binance_client.get_symbol_ticker(symbol=coin)
    current_price = float(ticker["price"])

    # Determine price and amount
    if not price:
        price = current_price * 1.02
    price = round(price / tick_size) * tick_size

    if not amount:
        amount = 100 / current_price
    effective_amount = amount * leverage
    quantity = round(effective_amount / current_price, quantity_precision)

    print(f"Data: Coin={coin}, Amount={amount}, Leverage={leverage}, Price={price}")

    # Create order
    order = binance_client.futures_create_order(
        symbol=coin,
        side="BUY",
        type="LIMIT",
        quantity=quantity,
        price=round(price, price_precision),
        timeInForce="GTC"
    )

    print(order)
    return {"status": "success", "message": "Order created", "order": order}

@app.route('/futures_sell/', methods=['POST'])
@limiter.exempt  # This exempts this route from rate limiting
def futures_sell():
    data = request.get_json()
    print(data)

    # Normalize coin symbol
    raw_coin = data["coin"].upper()
    coin = get_prefixed_symbol(raw_coin)

    amount = float(data["amount"]) if "amount" in data else None
    price = data.get("price")

    # Fetch symbol info
    exchange_info = binance_client.futures_exchange_info()
    symbol_info = next((s for s in exchange_info['symbols'] if s['symbol'] == coin), None)
    if not symbol_info:
        raise ValueError(f"Invalid symbol: {coin}")

    quantity_precision = symbol_info['quantityPrecision']
    price_precision = symbol_info['pricePrecision']
    tick_size = next(float(f['tickSize']) for f in symbol_info['filters'] if f['filterType'] == 'PRICE_FILTER')

    # Get current ticker price
    ticker = binance_client.get_symbol_ticker(symbol=coin)
    current_price = float(ticker["price"])

    # Determine price and amount
    if not price:
        price = current_price * 0.975
    price = round(price / tick_size) * tick_size

    if not amount:
        amount = 100 / current_price
    quantity = round(amount, quantity_precision)

    print(f"Data: Coin={coin}, Amount={amount}, Price={price}")

    # Create order
    order = binance_client.futures_create_order(
        symbol=coin,
        side="SELL",
        type="LIMIT",
        quantity=quantity,
        price=round(price, price_precision),
        timeInForce="GTC"
    )

    print(order)
    return {"status": "success", "message": "Order created", "order": order}


@app.route('/button_long/', methods=['POST'])
@limiter.exempt  # This exempts this route from rate limiting
def button_long():
    data = request.get_json()
    print(data)

    amount = float(data["amount"])
    coin = data["coin"].upper()
    if coin == "LUNAUSDT":
        coin = "LUNA2USDT"
    # Add logic to handle "1000" prefixed symbols
    if coin in ["SHIBUSDT", "XECUSDT", "LUNCUSDT", "PEPEUSDT", "FLOKIUSDT", "BONKUSDT", 
                "SATSUSDT", "RATSUSDT", "CATUSDT", "MOGUSDT", "XUSDT", "CHEEMSUSDT", "WHYUSDT"]:
        coin = f"1000{coin}"

    # Get symbol info for precision and tick size
    exchange_info = binance_client.futures_exchange_info()
    symbol_info = next((s for s in exchange_info['symbols'] if s['symbol'] == coin), None)
    print(coin)
    if not symbol_info:
        raise ValueError(f"Invalid symbol: {coin}")

    quantity_precision = symbol_info['quantityPrecision']
    price_precision = symbol_info['pricePrecision']

    # Fetch tick size and lot size filters
    tick_size = None
    min_qty = None
    step_size = None
    
    for filter in symbol_info['filters']:
        if filter['filterType'] == 'PRICE_FILTER':
            tick_size = float(filter['tickSize'])
        elif filter['filterType'] == 'LOT_SIZE':
            min_qty = float(filter['minQty'])
            step_size = float(filter['stepSize'])

    if not all([tick_size, min_qty, step_size]):
        raise ValueError(f"Required filters not found for symbol: {coin}")

    # Get current ticker price
    ticker = binance_client.get_symbol_ticker(symbol=coin)
    current_price = float(ticker["price"])

    # Calculate base quantity
    quantity = amount / current_price

    # Adjust quantity to step size
    quantity = float(round(quantity / step_size) * step_size)
    
    # Round to the correct precision
    quantity = float('{:.{}f}'.format(quantity, quantity_precision))
    
    # Ensure quantity meets minimum
    if quantity < min_qty:
        raise ValueError(f"Quantity {quantity} is below minimum {min_qty} for {coin}")

    # Calculate price with 2% adjustment for BUY
    price = current_price * 1.02
    
    # Adjust price to tick size and precision
    price = float(round(price / tick_size) * tick_size)
    price = float('{:.{}f}'.format(price, price_precision))

    # Set leverage to 10x for the symbol
    binance_client.futures_change_leverage(symbol=coin, leverage=10)

    # Create the order
    order = binance_client.futures_create_order(
        symbol=coin,
        side="BUY",
        type="LIMIT",
        quantity=quantity,
        price=price,
        leverage=10,
        timeInForce="GTC"
    )

    print(order)
    return {"status": "success", "message": "Order Longed Correctly", "order": order}

@app.route('/button_short/', methods=['POST'])
@limiter.exempt  # This exempts this route from rate limiting
def button_short():
    data = request.get_json()
    print(data)

    amount = float(data["amount"])
    coin = data["coin"].upper()
    if coin == "LUNAUSDT":
        coin = "LUNA2USDT"
    # Add logic to handle "1000" prefixed symbols
    if coin in ["SHIBUSDT", "XECUSDT", "LUNCUSDT", "PEPEUSDT", "FLOKIUSDT", "BONKUSDT", 
                "SATSUSDT", "RATSUSDT", "CATUSDT", "MOGUSDT", "XUSDT", "CHEEMSUSDT", "WHYUSDT"]:
        coin = f"1000{coin}"

    # Get symbol info for precision and tick size
    exchange_info = binance_client.futures_exchange_info()
    symbol_info = next((s for s in exchange_info['symbols'] if s['symbol'] == coin), None)
    if not symbol_info:
        raise ValueError(f"Invalid symbol: {coin}")

    quantity_precision = symbol_info['quantityPrecision']
    price_precision = symbol_info['pricePrecision']

    # Fetch tick size and lot size filters
    tick_size = None
    min_qty = None
    step_size = None
    
    for filter in symbol_info['filters']:
        if filter['filterType'] == 'PRICE_FILTER':
            tick_size = float(filter['tickSize'])
        elif filter['filterType'] == 'LOT_SIZE':
            min_qty = float(filter['minQty'])
            step_size = float(filter['stepSize'])

    if not all([tick_size, min_qty, step_size]):
        raise ValueError(f"Required filters not found for symbol: {coin}")

    # Get current ticker price
    ticker = binance_client.get_symbol_ticker(symbol=coin)
    current_price = float(ticker["price"])

    # Calculate base quantity
    quantity = amount / current_price

    # Adjust quantity to step size
    quantity = float(round(quantity / step_size) * step_size)
    
    # Round to the correct precision
    quantity = float('{:.{}f}'.format(quantity, quantity_precision))
    
    # Ensure quantity meets minimum
    if quantity < min_qty:
        raise ValueError(f"Quantity {quantity} is below minimum {min_qty} for {coin}")

    # Calculate price with 2% adjustment for SELL
    price = current_price * 0.98
    
    # Adjust price to tick size and precision
    price = float(round(price / tick_size) * tick_size)
    price = float('{:.{}f}'.format(price, price_precision))

    # Set leverage to 10x for the symbol
    binance_client.futures_change_leverage(symbol=coin, leverage=10)

    # Create the order
    order = binance_client.futures_create_order(
        symbol=coin,
        side="SELL",
        type="LIMIT",
        quantity=quantity,
        price=price,
        leverage=10,
        timeInForce="GTC"
    )

    print(order)
    return {"status": "success", "message": "Order Shorted Correctly", "order": order}
def get_timestamp_offset():
    """
    Calculate the time offset between local system and Binance server
    Returns offset in milliseconds (can be positive or negative)
    """
    try:
        server_time = binance_client.get_server_time()
        local_time = int(time.time() * 1000)
        return local_time - server_time['serverTime']
    except Exception as e:
        print(f"Error getting server time: {str(e)}")
        return 0

def synchronized_request(func):
    """
    Decorator to handle timestamp synchronization for Binance API requests
    """
    def wrapper(*args, **kwargs):
        # Get current offset
        offset = get_timestamp_offset()
        
        # If significant offset detected, adjust system time for this request
        if abs(offset) > 1000:  # 1 second threshold
            print(f"Time offset detected: {offset}ms")
            # Wait for the difference if we're ahead
            if offset > 0:
                time.sleep(offset / 1000)
        
        return func(*args, **kwargs)
    return wrapper

def analyze_news(news_data):
    try:
        title = news_data.get("title", "No Title")
        body = news_data.get("body", "No Description")
        source = news_data.get("source", "Unknown Source")
        coins = []

        # Extract coin names from suggestions if available
        if "suggestions" in news_data and news_data["suggestions"]:
            for suggestion in news_data["suggestions"]:
                if "coin" in suggestion:
                    coins.append(suggestion["coin"])

        # If no suggestions found but coins mentioned in body
        if not coins and "found" in news_data:
            coins = news_data["found"]

        coins_str = ", ".join(coins) if coins else "None specifically mentioned"

        # Improved prompt with stricter criteria and more examples of non-actionable news
        prompt = f"""
Title: {title}
Body: {body}
Source: {source}
Mentioned coins: {coins_str}

Evaluate the impact based on:

    Source credibility
        Is this news coming from an official project account (e.g., TON Foundation, Ethereum Foundation)?
        Is it from a major news source that moves markets (e.g., Bloomberg, Coindesk, Reuters)?
        Is it community speculation or unconfirmed?

    Direct vs. indirect market impact
        Does this news directly change the coin's fundamentals (tech upgrade, partnership, regulatory win/loss)?
        Does it indirectly impact market confidence (e.g., a key figure regaining freedom, influential endorsements, major market sentiment shifts)?

    Market sentiment & engagement
        Are large crypto traders, influencers, or whales reacting strongly to this?
        Has the news caused significant engagement (high Twitter/Reddit activity, spikes in mentions)?

Determine the most affected cryptocurrency and classify the impact using these criteria:

    "This will make the market pump" if:
        A major institution is adopting crypto or launching a related product.
        A regulatory win occurs (approvals, favorable rulings, dropped investigations).
        A major technical breakthrough or upgrade is successfully completed.
        An influential figure directly or indirectly improves confidence in the project (e.g., Durov regaining full control over his movements).
        An official project account is celebrating the event as bullish.
        A partnership brings immediate large-scale utility.

    "This will make the market dump" if:
        A security breach, hack, or exploit has occurred.
        A new regulatory investigation or legal action emerges.
        A confirmed token unlock is about to introduce strong selling pressure.
        A project has failed, rugged, or declared bankruptcy.
        A coin is getting delisted or has had a technical failure.
        A major holder has announced selling their position.
        A negative sentiment shift is confirmed by high engagement (e.g., panic-selling tweets, large forum discussions).

        "Market impact likely neutral" for all other cases.

        RETURN ONLY ONE OF THE THREE PHRASES BELOW FOLLOWED BY THE MOST AFFECTED COIN IN PARENTHESES:
        
            "This will make the market pump (COIN)"
            "This will make the market dump (COIN)"
            "Market impact likely neutral (COIN)"
        
        DO NOT provide explanations—only return the classification.

        """


        # Call to the Google GenAI API
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        # Extracting and returning the response text
        return response.text.strip()
    except Exception as o:
        print(o)
@app.route('/analyze_news', methods=['POST'])
@limiter.exempt  # This exempts this route from rate limiting
def analyze_news_route():
    try:
        # Get the news data from the POST request
        news_data = request.json

        # Call the function to analyze news
        analysis_result = analyze_news(news_data)
        print(analysis_result)
        # Return the result as a JSON response
        return jsonify({"analysis": analysis_result})

    except Exception as e:
        return jsonify({"error": str(e)}), 400




@app.route("/positions/", methods=["GET"])
@limiter.exempt  # This exempts this route from rate limiting
@synchronized_request
def get_positions():
    try:
        start_time = time.time()
        print("Fetching positions from Binance API...")
        
        # Get positions with synchronized timestamp
        list_of_dicts = binance_client.futures_account()['positions']
        print("Positions data received")
        
        # Filter and transform positions
        filtered_list = [
            {
                **position,
                'isolated': 'true' if position['isolated'] else 'false'
            }
            for position in list_of_dicts
            if float(position['notional']) != 0
        ]
        
        elapsed_time = time.time() - start_time
        print(f"Time taken for API call: {elapsed_time:.2f} seconds")
        
        return jsonify(filtered_list)
        
    except Exception as e:
        error_message = f"Error fetching positions: {str(e)}"
        print(error_message)
        return jsonify({
            "error": "Failed to fetch positions",
            "details": str(e)
        }), 500


@app.route("/close_short_limit_position/", methods = ["POST"])
@limiter.exempt  # This exempts this route from rate limiting
def close_short_limit_position():
    data = request.get_json()
    print(data)
    coin = data["coin"]
    

    amount = data["amount"]
    price = (data["price"])
    closed = binance_client.futures_create_order(
    symbol = coin,
    side="BUY", 
    type="LIMIT", 
    quantity=amount,
    price=price,
    reduceOnly = "true",

    )
    print(closed)

    
    return(closed)


@app.route("/balance/", methods=["GET"])
@limiter.exempt  # This exempts this route from rate limiting
def balanceBinanceFutures():
    acc_balance = binance_client.futures_account_balance()    
    usdt_balance = next((item['balance'] for item in acc_balance if item['asset'] == 'USDT'), '0.00000000')
    print(usdt_balance)
    return(usdt_balance)


@app.route("/close_long_limit_position/", methods = ["POST"])
@limiter.exempt  # This exempts this route from rate limiting
def close_long_limit_position():
    data = request.get_json()
    print(data)

    coin = data["coin"]
    

    amount = data["amount"]
    price = (data["price"])
    closed = binance_client.futures_create_order(
    symbol = coin,
    side="SELL", 
    type="LIMIT", 
    quantity=amount, 
    price=price,
    reduceOnly = "true",
    )
    
    print(closed)


if __name__ == '__main__':
    app.run()




