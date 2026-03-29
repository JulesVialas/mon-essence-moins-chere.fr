import type { NextRequest } from "next/server";

const GOV_API =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";

const FUEL_FIELD: Record<string, string> = {
  Gazole: "gazole",
  SP95: "sp95",
  SP98: "sp98",
  E10: "e10",
  E85: "e85",
  GPLc: "gplc",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const fuel = searchParams.get("fuel") || "SP95";
  const radius = searchParams.get("radius") || "10";

  if (!lat || !lon) {
    return Response.json(
      { error: "Coordonnées manquantes (lat/lon requis)" },
      { status: 400 }
    );
  }

  const radiusNum = Math.min(Math.max(Number(radius), 1), 100);
  if (isNaN(radiusNum)) {
    return Response.json({ error: "Rayon invalide" }, { status: 400 });
  }

  const fuelKey = FUEL_FIELD[fuel];
  if (!fuelKey) {
    return Response.json({ error: `Carburant inconnu: ${fuel}` }, { status: 400 });
  }

  const priceField = `${fuelKey}_prix`;
  const majField = `${fuelKey}_maj`;
  const ruptureField = `${fuelKey}_rupture_debut`;

  const params = new URLSearchParams({
    where: `${priceField} IS NOT NULL AND distance(geom, geom'POINT(${lon} ${lat})', ${radiusNum}km)`,
    limit: "50",
    order_by: `${priceField} ASC`,
    select: `id,adresse,ville,cp,geom,${priceField},${majField},${ruptureField},pop`,
    timezone: "Europe/Paris",
  });

  try {
    const res = await fetch(`${GOV_API}?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Gov API error", res.status, body);
      return Response.json(
        { error: "Erreur de l'API gouvernementale", detail: body },
        { status: res.status }
      );
    }

    const data = await res.json();

    const results = (data.results ?? []).map(
      (s: Record<string, unknown>) => ({
        ...s,
        prix: s[priceField],
        maj: s[majField],
        rupture: !!s[ruptureField],
      })
    );

    return Response.json({ ...data, results });
  } catch {
    return Response.json({ error: "Erreur de connexion" }, { status: 500 });
  }
}
