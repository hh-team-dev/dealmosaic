import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDirectProducts,
  rupees,
  type PublicDirectProduct,
} from "../lib/direct-api";
export function DirectCard({
  product: p,
  seller,
}: {
  product: PublicDirectProduct;
  seller: string;
}) {
  const photo = p.media.find((m) => m.kind === "image");
  return (
    <article className="card direct-card">
      <Link to={`/buy/${p.id}`} className="direct-photo">
        {photo && (
          <img
            src={`/api/direct/media/${photo.id}`}
            alt={photo.alt}
            loading="lazy"
            width="600"
            height="600"
          />
        )}
      </Link>
      <div className="stack direct-card-body">
        <span className="badge badge-lime">Featured · Owner-operated sale</span>
        <h3 className="h3">
          <Link to={`/buy/${p.id}`}>{p.title}</Link>
        </h3>
        <p className="small muted">Sold by {seller}</p>
        <div className="row wrap">
          <strong className="direct-price">{rupees(p.priceMinor)}</strong>
          {p.discount && (
            <>
              <del className="small muted">{rupees(p.referenceMinor)}</del>
              <span className="direct-saving">
                {p.discount.percent > 0
                  ? `${p.discount.percent}% off`
                  : `Save ${rupees(p.discount.savingMinor)}`}
              </span>
            </>
          )}
        </div>
        <p className="small muted">
          Delivery calculated for your PIN.{" "}
          {p.variants.some((v) => v.mode === "made")
            ? "Made-to-order options available."
            : "Ready-stock options."}
        </p>
        <Link className="btn btn-primary" to={`/buy/${p.id}`}>
          View details
        </Link>
      </div>
    </article>
  );
}
export function DirectShelf() {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getDirectProducts>
  > | null>(null);
  useEffect(() => {
    const c = new AbortController();
    getDirectProducts(c.signal)
      .then(setData)
      .catch(() => {});
    return () => c.abort();
  }, []);
  const products =
    data?.products
      .filter((p) => p.variants.some((v) => v.available > 0))
      .slice(0, 2) ?? [];
  if (!products.length || !data?.seller) return null;
  return (
    <section
      className="container direct-shelf"
      aria-labelledby="direct-finds-title"
    >
      <div className="row wrap" style={{ justifyContent: "space-between" }}>
        <div>
          <p className="eyebrow">Selected for discovery · direct sales</p>
          <h2 className="h2" id="direct-finds-title">
            Handcrafted finds
          </h2>
        </div>
        <Link to="/handcrafted" className="btn btn-ghost">
          See the collection
        </Link>
      </div>
      <p className="muted">
        Products sold by the person operating DealMosaic. Buy here; delivery is
        checked separately.
      </p>
      <div className="direct-grid">
        {products.map((p) => (
          <DirectCard key={p.id} product={p} seller={data.seller!.name} />
        ))}
      </div>
    </section>
  );
}
