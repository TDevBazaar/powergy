import { ImageResponse } from "next/og";
import { formatPrice, formatPriceLabel } from "@/lib/format";
import type { OrderPreviewData, OrderPreviewLine } from "@/lib/order-preview";
import {
  fetchPreviewOrderData,
  fetchSafeOgDataUri,
} from "@/lib/order-preview-server";

const WIDTH = 800;
const HEIGHT = 420;

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
  borderRadius = 14,
  qtyBadge,
  badgeFontSize = 14,
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
              fontSize: Math.max(24, Math.round(width * 0.28)),
              fontWeight: 700,
              color: "#5C4633",
            }}
          >
            {initialFor(tile.line.name)}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#8F6A4B",
              marginTop: 4,
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
            top: 7,
            right: 7,
            backgroundColor: "#221C15",
            color: "#FBF6EE",
            borderRadius: 999,
            padding: "3px 9px",
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
          height: 56,
          padding: "14px 22px 0 22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 999,
              backgroundColor: "#221C15",
              color: "#FBF6EE",
              fontSize: 15,
              fontWeight: 700,
              marginRight: 8,
            }}
          >
            N
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              color: "#221C15",
              marginRight: 11,
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
              padding: "4px 12px",
              fontSize: 14,
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
                border: "1.5px solid #E6DCC9",
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 14,
                fontWeight: 600,
                color: "#5C4633",
                marginRight: 8,
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
              padding: "4px 14px",
              fontSize: 15,
              fontWeight: 700,
              color: "#FBF6EE",
            }}
          >
            {headerSubtotal}
          </div>
        </div>
      </div>

      {/* Área principal del collage (756 × 330) */}
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "14px 22px 18px 22px",
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
              height: 330,
              borderRadius: 20,
              backgroundColor: "#FFFDF9",
              border: "1.5px solid #E6DCC9",
              padding: 28,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 3,
                color: "#8F6A4B",
              }}
            >
              RESUMEN DE PEDIDO
            </span>
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#221C15",
                marginTop: 10,
              }}
            >
              {`#${truncateText(order.reference, 26)}`}
            </span>
            <span
              style={{
                fontSize: 16,
                color: "#786957",
                marginTop: 10,
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
              height: 330,
              borderRadius: 20,
              backgroundColor: "#FFFDF9",
              border: "1.5px solid #E6DCC9",
              padding: 14,
              alignItems: "center",
            }}
          >
            <ProductImageBox
              tile={tiles[0]}
              width={240}
              height={302}
              borderRadius={15}
              qtyBadge={tiles[0].line.qty}
              badgeFontSize={18}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                paddingLeft: 24,
                paddingRight: 10,
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
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {truncateText(tiles[0].line.categoryName, 26)}
              </div>
              <span
                style={{
                  fontSize: 27,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "#221C15",
                  marginTop: 14,
                }}
              >
                {truncateText(tiles[0].line.name, 70)}
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    backgroundColor: "#221C15",
                    color: "#FBF6EE",
                    borderRadius: 12,
                    padding: "7px 15px",
                    fontSize: 18,
                    fontWeight: 700,
                    marginRight: 14,
                  }}
                >
                  {`Cantidad: ×${tiles[0].line.qty}`}
                </div>
                <span
                  style={{
                    fontSize: 28,
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
              height: 330,
              justifyContent: "space-between",
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.line.productId}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: 370,
                  height: 330,
                  borderRadius: 18,
                  backgroundColor: "#FFFDF9",
                  border: "1.5px solid #E6DCC9",
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <ProductImageBox
                  tile={tile}
                  width={180}
                  height={306}
                  borderRadius={14}
                  qtyBadge={tile.line.qty}
                  badgeFontSize={16}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    paddingLeft: 14,
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
                      padding: "3px 9px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {truncateText(tile.line.categoryName, 18)}
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color: "#221C15",
                      marginTop: 10,
                    }}
                  >
                    {truncateText(tile.line.name, 52)}
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#221C15",
                      marginTop: 14,
                    }}
                  >
                    {formatPriceLabel(tile.line.lineTotal)}
                  </span>
                  {tile.line.qty > 1 && tile.line.unitPrice > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#786957",
                        marginTop: 4,
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
              height: 330,
              justifyContent: "space-between",
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.line.productId}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 242,
                  height: 330,
                  borderRadius: 18,
                  backgroundColor: "#FFFDF9",
                  border: "1.5px solid #E6DCC9",
                  padding: 10,
                }}
              >
                <ProductImageBox
                  tile={tile}
                  width={222}
                  height={226}
                  borderRadius={12}
                  qtyBadge={tile.line.qty}
                  badgeFontSize={15}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    justifyContent: "space-between",
                    paddingTop: 8,
                    paddingLeft: 3,
                    paddingRight: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
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
                    <span style={{ fontSize: 11, color: "#786957" }}>
                      {truncateText(tile.line.categoryName, 16)}
                    </span>
                    <span
                      style={{
                        fontSize: 16,
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
              height: 330,
              justifyContent: "space-between",
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.line.productId}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 178,
                  height: 330,
                  borderRadius: 16,
                  backgroundColor: "#FFFDF9",
                  border: "1.5px solid #E6DCC9",
                  padding: 8,
                }}
              >
                <ProductImageBox
                  tile={tile}
                  width={162}
                  height={222}
                  borderRadius={12}
                  qtyBadge={tile.line.qty}
                  badgeFontSize={14}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    justifyContent: "space-between",
                    paddingTop: 8,
                    paddingLeft: 3,
                    paddingRight: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: "#221C15",
                    }}
                  >
                    {truncateText(tile.line.name, 34)}
                  </span>
                  <span
                    style={{
                      fontSize: 16,
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
              height: 330,
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
                  width: 244,
                  height: 158,
                  borderRadius: 16,
                  backgroundColor: "#FFFDF9",
                  border: "1.5px solid #E6DCC9",
                  padding: 8,
                  alignItems: "center",
                }}
              >
                <ProductImageBox
                  tile={tile}
                  width={106}
                  height={142}
                  borderRadius={12}
                  qtyBadge={tile.line.qty}
                  badgeFontSize={13}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    height: "100%",
                    paddingLeft: 10,
                    paddingTop: 2,
                    paddingBottom: 2,
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#8F6A4B",
                      }}
                    >
                      {truncateText(tile.line.categoryName, 16)}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        lineHeight: 1.22,
                        color: "#221C15",
                        marginTop: 4,
                      }}
                    >
                      {truncateText(tile.line.name, 40)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 15,
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
                  width: 244,
                  height: 158,
                  borderRadius: 16,
                  backgroundColor: "#221C15",
                  color: "#FBF6EE",
                  padding: 14,
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#F0E6D6",
                  }}
                >
                  {`+${extraLines.length} más`}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: 1.35,
                    color: "#D9BFA7",
                    marginTop: 6,
                  }}
                >
                  {truncateText(
                    extraLines
                      .slice(0, 3)
                      .map((l) => `${l.qty}× ${l.name}`)
                      .join(" · "),
                    70
                  )}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#B08968",
                    marginTop: 10,
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
                  width: 244,
                  height: 158,
                  borderRadius: 16,
                  backgroundColor: "#EFE6D6",
                  border: "1.5px solid #E6DCC9",
                  padding: 15,
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: "#8F6A4B",
                  }}
                >
                  RESUMEN
                </span>
                <span
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    color: "#221C15",
                    marginTop: 6,
                  }}
                >
                  {`${order.totalQty} artículos`}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#5C4633",
                    marginTop: 4,
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

/** Genera la imagen PNG 800×420 para WhatsApp Open Graph con respaldo automático */
export async function renderOrderPreviewResponse(
  ref: string,
  token: string
): Promise<Response> {
  const order = await fetchPreviewOrderData(ref, token, {
    preferSnapshot: true,
  });

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
