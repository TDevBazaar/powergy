import { ImageResponse } from "next/og";
import { formatPrice, formatPriceLabel } from "@/lib/format";
import type { OrderPreviewData, OrderPreviewLine } from "@/lib/order-preview";
import {
  fetchPreviewOrderData,
  fetchSafeOgDataUri,
} from "@/lib/order-preview-server";

const WIDTH = 1200;
const HEIGHT = 630;

interface PreviewTile {
  line: OrderPreviewLine;
  dataUri: string | null;
}

function truncateText(text: string, maxLength: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function initialFor(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return /[A-Z0-9ÁÉÍÓÚÑ]/i.test(first) ? first : "N";
}

function ProductImageBox({
  tile,
  width,
  height,
  borderRadius = 18,
  qtyBadge,
  badgeFontSize = 20,
}: {
  tile: PreviewTile;
  width: number;
  height: number;
  borderRadius?: number;
  qtyBadge?: number;
  badgeFontSize?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        borderRadius,
        overflow: "hidden",
        backgroundColor: "#EFE6D6",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {tile.dataUri ? (
        <img
          src={tile.dataUri}
          alt={tile.line.name}
          width={width}
          height={height}
          style={{
            width,
            height,
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#E9DCC6",
            color: "#8F6A4B",
          }}
        >
          <span
            style={{
              fontSize: Math.max(32, Math.round(width * 0.28)),
              fontWeight: 700,
              color: "#5C4633",
            }}
          >
            {initialFor(tile.line.name)}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#8F6A4B",
              marginTop: 6,
            }}
          >
            NOVA MODA
          </span>
        </div>
      )}

      {typeof qtyBadge === "number" && (
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "#221C15",
            color: "#FBF6EE",
            borderRadius: 999,
            padding: "4px 12px",
            fontSize: badgeFontSize,
            fontWeight: 700,
            border: "2px solid #FFFDF9",
          }}
        >
          {`×${qtyBadge}`}
        </div>
      )}
    </div>
  );
}

function renderCollageJsx(
  order: OrderPreviewData,
  tiles: PreviewTile[],
  extraLines: OrderPreviewLine[]
) {
  const headerSubtotal =
    order.subtotal > 0 ? formatPrice(order.subtotal) : "Por confirmar";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "#F7F1E8",
        color: "#221C15",
        fontFamily: "sans-serif",
      }}
    >
      {/* Cabecera de marca + referencia */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 82,
          padding: "22px 32px 0 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 999,
              backgroundColor: "#221C15",
              color: "#FBF6EE",
              fontSize: 22,
              fontWeight: 700,
              marginRight: 12,
            }}
          >
            N
          </div>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 3,
              color: "#221C15",
              marginRight: 16,
            }}
          >
            NOVA MODA
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#E9DCC6",
              borderRadius: 999,
              padding: "6px 16px",
              fontSize: 20,
              fontWeight: 700,
              color: "#221C15",
            }}
          >
            {`Pedido #${truncateText(order.reference, 22)}`}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {order.totalQty > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#FFFDF9",
                border: "2px solid #E6DCC9",
                borderRadius: 999,
                padding: "6px 16px",
                fontSize: 20,
                fontWeight: 600,
                color: "#5C4633",
                marginRight: 10,
              }}
            >
              {`${order.totalQty} ${order.totalQty === 1 ? "artículo" : "artículos"}`}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#221C15",
              borderRadius: 999,
              padding: "6px 18px",
              fontSize: 22,
              fontWeight: 700,
              color: "#FBF6EE",
            }}
          >
            {headerSubtotal}
          </div>
        </div>
      </div>

      {/* Área principal del collage */}
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "20px 32px 26px 32px",
          alignItems: "stretch",
          justifyContent: "center",
        }}
      >
        {tiles.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              borderRadius: 28,
              backgroundColor: "#FFFDF9",
              border: "2px solid #E6DCC9",
              padding: 40,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: 4,
                color: "#8F6A4B",
              }}
            >
              RESUMEN DE PEDIDO
            </span>
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: "#221C15",
                marginTop: 14,
              }}
            >
              {`#${truncateText(order.reference, 26)}`}
            </span>
            <span
              style={{
                fontSize: 24,
                color: "#786957",
                marginTop: 14,
              }}
            >
              Toca el enlace para ver los artículos del pedido.
            </span>
          </div>
        )}

        {tiles.length === 1 && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              height: 492,
              borderRadius: 28,
              backgroundColor: "#FFFDF9",
              border: "2px solid #E6DCC9",
              padding: 20,
              alignItems: "center",
            }}
          >
            <ProductImageBox
              tile={tiles[0]}
              width={360}
              height={452}
              borderRadius={22}
              qtyBadge={tiles[0].line.qty}
              badgeFontSize={26}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                paddingLeft: 36,
                paddingRight: 16,
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  backgroundColor: "#EFE6D6",
                  color: "#8F6A4B",
                  borderRadius: 999,
                  padding: "6px 18px",
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {truncateText(tiles[0].line.categoryName, 26)}
              </div>
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "#221C15",
                  marginTop: 20,
                }}
              >
                {truncateText(tiles[0].line.name, 70)}
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 30,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    backgroundColor: "#221C15",
                    color: "#FBF6EE",
                    borderRadius: 16,
                    padding: "10px 22px",
                    fontSize: 26,
                    fontWeight: 700,
                    marginRight: 18,
                  }}
                >
                  {`Cantidad: ×${tiles[0].line.qty}`}
                </div>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    color: "#221C15",
                  }}
                >
                  {formatPriceLabel(tiles[0].line.lineTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {tiles.length === 2 && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              height: 492,
              justifyContent: "space-between",
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.line.productId}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: 556,
                  height: 492,
                  borderRadius: 26,
                  backgroundColor: "#FFFDF9",
                  border: "2px solid #E6DCC9",
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <ProductImageBox
                  tile={tile}
                  width={270}
                  height={460}
                  borderRadius={20}
                  qtyBadge={tile.line.qty}
                  badgeFontSize={22}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    paddingLeft: 20,
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignSelf: "flex-start",
                      backgroundColor: "#EFE6D6",
                      color: "#8F6A4B",
                      borderRadius: 999,
                      padding: "4px 12px",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {truncateText(tile.line.categoryName, 18)}
                  </div>
                  <span
                    style={{
                      fontSize: 27,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color: "#221C15",
                      marginTop: 14,
                    }}
                  >
                    {truncateText(tile.line.name, 54)}
                  </span>
                  <span
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: "#221C15",
                      marginTop: 22,
                    }}
                  >
                    {formatPriceLabel(tile.line.lineTotal)}
                  </span>
                  {tile.line.qty > 1 && tile.line.unitPrice > 0 && (
                    <span
                      style={{
                        fontSize: 17,
                        color: "#786957",
                        marginTop: 6,
                      }}
                    >
                      {`${formatPrice(tile.line.unitPrice)} c/u`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tiles.length === 3 && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              height: 492,
              justifyContent: "space-between",
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.line.productId}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 364,
                  height: 492,
                  borderRadius: 24,
                  backgroundColor: "#FFFDF9",
                  border: "2px solid #E6DCC9",
                  padding: 14,
                }}
              >
                <ProductImageBox
                  tile={tile}
                  width={336}
                  height={338}
                  borderRadius={18}
                  qtyBadge={tile.line.qty}
                  badgeFontSize={21}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    justifyContent: "space-between",
                    paddingTop: 12,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 21,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: "#221C15",
                    }}
                  >
                    {truncateText(tile.line.name, 42)}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 16, color: "#786957" }}>
                      {truncateText(tile.line.categoryName, 16)}
                    </span>
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "#221C15",
                      }}
                    >
                      {formatPriceLabel(tile.line.lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tiles.length === 4 && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              height: 492,
              justifyContent: "space-between",
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.line.productId}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 268,
                  height: 492,
                  borderRadius: 24,
                  backgroundColor: "#FFFDF9",
                  border: "2px solid #E6DCC9",
                  padding: 12,
                }}
              >
                <ProductImageBox
                  tile={tile}
                  width={244}
                  height={332}
                  borderRadius={16}
                  qtyBadge={tile.line.qty}
                  badgeFontSize={20}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    justifyContent: "space-between",
                    paddingTop: 12,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 19,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: "#221C15",
                    }}
                  >
                    {truncateText(tile.line.name, 34)}
                  </span>
                  <span
                    style={{
                      fontSize: 23,
                      fontWeight: 700,
                      color: "#221C15",
                    }}
                  >
                    {formatPriceLabel(tile.line.lineTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tiles.length >= 5 && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              width: "100%",
              height: 492,
              justifyContent: "space-between",
              alignContent: "space-between",
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.line.productId}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: 366,
                  height: 236,
                  borderRadius: 22,
                  backgroundColor: "#FFFDF9",
                  border: "2px solid #E6DCC9",
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <ProductImageBox
                  tile={tile}
                  width={158}
                  height={212}
                  borderRadius={16}
                  qtyBadge={tile.line.qty}
                  badgeFontSize={18}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    height: "100%",
                    paddingLeft: 14,
                    paddingTop: 4,
                    paddingBottom: 4,
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#8F6A4B",
                      }}
                    >
                      {truncateText(tile.line.categoryName, 16)}
                    </span>
                    <span
                      style={{
                        fontSize: 19,
                        fontWeight: 700,
                        lineHeight: 1.22,
                        color: "#221C15",
                        marginTop: 6,
                      }}
                    >
                      {truncateText(tile.line.name, 42)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#221C15",
                    }}
                  >
                    {formatPriceLabel(tile.line.lineTotal)}
                  </span>
                </div>
              </div>
            ))}

            {extraLines.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 366,
                  height: 236,
                  borderRadius: 22,
                  backgroundColor: "#221C15",
                  color: "#FBF6EE",
                  padding: 20,
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 38,
                    fontWeight: 700,
                    color: "#F0E6D6",
                  }}
                >
                  {`+${extraLines.length} más`}
                </span>
                <span
                  style={{
                    fontSize: 17,
                    lineHeight: 1.35,
                    color: "#D9BFA7",
                    marginTop: 10,
                  }}
                >
                  {truncateText(
                    extraLines
                      .slice(0, 3)
                      .map((l) => `${l.qty}× ${l.name}`)
                      .join(" · "),
                    76
                  )}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#B08968",
                    marginTop: 14,
                  }}
                >
                  Toca para ver todo el pedido →
                </span>
              </div>
            )}

            {tiles.length === 5 && extraLines.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 366,
                  height: 236,
                  borderRadius: 22,
                  backgroundColor: "#EFE6D6",
                  border: "2px solid #E6DCC9",
                  padding: 22,
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: "#8F6A4B",
                  }}
                >
                  RESUMEN
                </span>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#221C15",
                    marginTop: 8,
                  }}
                >
                  {`${order.totalQty} artículos`}
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#5C4633",
                    marginTop: 6,
                  }}
                >
                  {`Total: ${headerSubtotal}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Genera la imagen PNG 1200×630 para WhatsApp Open Graph con respaldo automático */
export async function renderOrderPreviewResponse(
  ref: string,
  token: string
): Promise<Response> {
  const order = await fetchPreviewOrderData(ref, token);

  const hasOverflow = order.lines.length > 6;
  const visibleLines = hasOverflow
    ? order.lines.slice(0, 5)
    : order.lines.slice(0, 6);
  const extraLines = hasOverflow ? order.lines.slice(5) : [];

  const fetchedImages = await Promise.allSettled(
    visibleLines.map((line) => fetchSafeOgDataUri(line.image))
  );

  const tiles: PreviewTile[] = visibleLines.map((line, index) => {
    const result = fetchedImages[index];
    return {
      line,
      dataUri: result?.status === "fulfilled" ? result.value : null,
    };
  });

  const headers = {
    "Content-Type": "image/png",
    "Cache-Control":
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  };

  try {
    const imageRes = new ImageResponse(
      renderCollageJsx(order, tiles, extraLines),
      { width: WIDTH, height: HEIGHT }
    );
    const pngBytes = Buffer.from(await imageRes.arrayBuffer());
    return new Response(pngBytes, { status: 200, headers });
  } catch {
    const fallbackTiles: PreviewTile[] = visibleLines.map((line) => ({
      line,
      dataUri: null,
    }));
    const fallbackRes = new ImageResponse(
      renderCollageJsx(order, fallbackTiles, extraLines),
      { width: WIDTH, height: HEIGHT }
    );
    const pngBytes = Buffer.from(await fallbackRes.arrayBuffer());
    return new Response(pngBytes, { status: 200, headers });
  }
}

