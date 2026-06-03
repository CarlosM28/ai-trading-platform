// Utilidades para firma criptográfica y sincronización con las APIs demo reales

// Genera una firma HMAC-SHA256 usando Web Crypto API nativo del navegador
export async function sha256Hmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);
  
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Formateador de decimales para lotes de Binance para evitar errores de LOT_SIZE
function formatBinanceLotSize(symbol: string, qty: number): string {
  const sym = symbol.toUpperCase();
  if (sym === 'BTC') return qty.toFixed(5);
  if (sym === 'ETH') return qty.toFixed(4);
  if (sym === 'SOL') return qty.toFixed(2);
  if (sym === 'XRP' || sym === 'XLM' || sym === 'HBAR') return qty.toFixed(1);
  return qty.toFixed(4);
}

// --- SECCIÓN BINANCE TESTNET ---

interface BinanceBalanceResponse {
  asset: string;
  free: string;
  locked: string;
}

export interface BinanceAccountInfo {
  balanceUsdt: number;
  holdings: Record<string, number>;
}

export async function fetchBinanceAccount(
  apiKey: string,
  apiSecret: string
): Promise<BinanceAccountInfo> {
  const timestamp = Date.now();
  const queryStr = `timestamp=${timestamp}`;
  const signature = await sha256Hmac(apiSecret, queryStr);
  
  const url = `/api-binance-testnet/api/v3/account?${queryStr}&signature=${signature}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': apiKey,
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error en Binance API (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const balances: BinanceBalanceResponse[] = data.balances || [];
  
  let balanceUsdt = 0;
  const holdings: Record<string, number> = {};

  balances.forEach(item => {
    const qty = Number(item.free);
    if (qty > 0) {
      if (item.asset === 'USDT') {
        balanceUsdt = qty;
      } else {
        holdings[item.asset] = qty;
      }
    }
  });

  return { balanceUsdt, holdings };
}

export async function executeBinanceOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  amountUsd: number,
  price: number,
  holdingQty: number,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  const timestamp = Date.now();
  const cleanSymbol = symbol.toUpperCase() === 'ENR1' ? 'ENR' : symbol.toUpperCase();
  const pair = `${cleanSymbol}USDT`;
  
  let queryStr = `symbol=${pair}&side=${side}&type=MARKET&timestamp=${timestamp}`;
  
  if (side === 'BUY') {
    // Binance permite comprar un monto directo de USDT (quoteOrderQty)
    queryStr += `&quoteOrderQty=${amountUsd.toFixed(2)}`;
  } else {
    // Para vender debemos enviar la cantidad física del activo
    const qtyToSell = Math.min(holdingQty, amountUsd / price);
    queryStr += `&quantity=${formatBinanceLotSize(cleanSymbol, qtyToSell)}`;
  }

  const signature = await sha256Hmac(apiSecret, queryStr);
  const url = `/api-binance-testnet/api/v3/order?${queryStr}&signature=${signature}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-MBX-APIKEY': apiKey,
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al enviar orden en Binance (${response.status}): ${errText}`);
  }

  return await response.json();
}

// --- SECCIÓN ALPACA PAPER TRADING ---

export interface AlpacaAccountInfo {
  cash: number;
  portfolioValue: number;
}

export async function fetchAlpacaAccount(
  apiKey: string,
  apiSecret: string
): Promise<AlpacaAccountInfo> {
  const url = `/api-alpaca-paper/v2/account`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error en Alpaca API (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return {
    cash: Number(data.cash),
    portfolioValue: Number(data.portfolio_value)
  };
}

export async function fetchAlpacaPositions(
  apiKey: string,
  apiSecret: string
): Promise<Record<string, number>> {
  const url = `/api-alpaca-paper/v2/positions`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al obtener posiciones en Alpaca (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const holdings: Record<string, number> = {};

  data.forEach((pos: any) => {
    holdings[pos.symbol] = Number(pos.qty);
  });

  return holdings;
}

export async function executeAlpacaOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  amountUsd: number,
  price: number,
  holdingQty: number,
  apiKey: string,
  apiSecret: string
): Promise<any> {
  const url = `/api-alpaca-paper/v2/orders`;
  
  const cleanSymbol = symbol.toUpperCase() === 'ENR1' ? 'ENR' : symbol.toUpperCase();
  
  const body: Record<string, any> = {
    symbol: cleanSymbol,
    side: side.toLowerCase(),
    type: 'market',
    time_in_force: 'day'
  };

  if (side === 'BUY') {
    // Alpaca permite órdenes de compra en dólares directamente usando notional
    body.notional = amountUsd.toFixed(2);
  } else {
    // Venta fraccionaria en acciones
    const qtyToSell = Math.min(holdingQty, amountUsd / price);
    body.qty = qtyToSell.toFixed(4);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al enviar orden en Alpaca (${response.status}): ${errText}`);
  }

  return await response.json();
}
