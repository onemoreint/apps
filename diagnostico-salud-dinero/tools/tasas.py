"""Actualiza diagnostico-salud-dinero/tasas.json con las tasas del dólar por país.

- Venezuela: USDT/VES en Binance P2P (mediana de los primeros anuncios de compra).
  Respaldo: dólar paralelo de ve.dolarapi.com.
- Colombia: TRM oficial (Superintendencia Financiera, datos.gov.co).
  Respaldo: tasa de mercado de open.er-api.com.
- Demás monedas: open.er-api.com.

Si una fuente falla, se conserva el último valor guardado de esa moneda.
Solo usa la biblioteca estándar de Python.
"""
import json, statistics, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

DEST = Path(__file__).resolve().parent.parent / "tasas.json"
MONEDAS = ["COP", "VES", "PEN", "MXN", "CLP", "EUR", "TRY"]
UA = {"User-Agent": "Mozilla/5.0 (diagnostico-salud-dinero)", "Accept": "application/json"}


def pedir(url, data=None):
    headers = dict(UA)
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def binance_ves():
    d = pedir("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
              {"asset": "USDT", "fiat": "VES", "tradeType": "BUY", "page": 1, "rows": 10,
               "payTypes": [], "publisherType": None})
    precios = [float(a["adv"]["price"]) for a in d.get("data", [])]
    if len(precios) < 3:
        raise ValueError("pocos anuncios")
    return round(statistics.median(precios), 2), "Binance P2P (USDT)"


def paralelo_ves():
    d = pedir("https://ve.dolarapi.com/v1/dolares/paralelo")
    return round(float(d["promedio"]), 2), "Dólar paralelo (respaldo)"


def trm_cop():
    d = pedir("https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1")
    return round(float(d[0]["valor"]), 2), "TRM Superfinanciera"


def mercado():
    d = pedir("https://open.er-api.com/v6/latest/USD")
    if d.get("result") != "success":
        raise ValueError("open.er-api sin datos")
    return d["rates"]


def main():
    previo = {}
    if DEST.exists():
        try:
            previo = json.loads(DEST.read_text()).get("monedas", {})
        except ValueError:
            previo = {}
    ahora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    nuevas, avisos = {}, []

    def poner(cod, intentos):
        for fn in intentos:
            try:
                tasa, fuente = fn()
                if tasa > 0:
                    viejo = previo.get(cod)
                    if viejo and viejo.get("tasa") == tasa and viejo.get("fuente") == fuente:
                        nuevas[cod] = viejo  # sin cambios: se conserva la fecha
                    else:
                        nuevas[cod] = {"tasa": tasa, "fuente": fuente, "fecha": ahora}
                    return
            except Exception as e:  # noqa: BLE001 — una fuente caída no debe tumbar las demás
                avisos.append(f"{cod} {getattr(fn, '__name__', 'fuente')}: {e}")
        if cod in previo:
            nuevas[cod] = previo[cod]
            avisos.append(f"{cod}: se conserva el valor anterior")

    try:
        rates = mercado()
    except Exception as e:  # noqa: BLE001
        rates = {}
        avisos.append(f"mercado: {e}")

    def de_mercado(cod):
        def fn():
            return round(float(rates[cod]), 4), "Tasa de mercado"
        fn.__name__ = f"mercado_{cod}"
        return fn

    poner("VES", [binance_ves, paralelo_ves])
    poner("COP", [trm_cop, de_mercado("COP")])
    for cod in ["PEN", "MXN", "CLP", "EUR", "TRY"]:
        poner(cod, [de_mercado(cod)])

    fechas = [v["fecha"] for v in nuevas.values()]
    salida = {"actualizado": max(fechas) if fechas else ahora, "base": "USD", "monedas": nuevas}
    DEST.write_text(json.dumps(salida, ensure_ascii=False, indent=2) + "\n")
    for a in avisos:
        print("aviso:", a, file=sys.stderr)
    print(json.dumps({k: v["tasa"] for k, v in nuevas.items()}))
    if not nuevas:
        sys.exit(1)


if __name__ == "__main__":
    main()
