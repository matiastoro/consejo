import { readFileSync } from "fs";
import path from "path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";

// Logos leídos del repo y cacheados a nivel de módulo.
const ASSETS = path.join(process.cwd(), "src", "assets", "acta");
let logoUchile: Buffer | null = null;
let logoFcfm: Buffer | null = null;
try {
  logoUchile = readFileSync(path.join(ASSETS, "uchile.png"));
  logoFcfm = readFileSync(path.join(ASSETS, "fcfm.png"));
} catch {
  // Sin logos el acta igual se genera, solo sin la cabecera gráfica.
}

// Fuente serif con negrita real (las built-in de react-pdf no traen Times
// negrita). DejaVu Serif es de libre redistribución y cubre acentos y ñ.
Font.register({
  family: "ActaSerif",
  fonts: [
    { src: path.join(ASSETS, "DejaVuSerif.ttf") },
    { src: path.join(ASSETS, "DejaVuSerif-Bold.ttf"), fontWeight: "bold" },
  ],
});
// Evita que palabras largas se corten con guiones automáticos.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: "ActaSerif",
    fontSize: 11,
    lineHeight: 1.4,
    color: "#1a1a1a",
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 56,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  logoUchile: { height: 70, objectFit: "contain" },
  logoFcfm: { height: 44, objectFit: "contain" },
  org: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: {
    width: 70,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: { flex: 1 },
  intro: { marginTop: 14, marginBottom: 10 },
  item: { flexDirection: "row", marginBottom: 8 },
  itemNumber: { width: 22, textAlign: "right", paddingRight: 8 },
  itemBody: { flex: 1, textAlign: "justify" },
  bold: { fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    textAlign: "center",
    fontSize: 8,
    color: "#888",
  },
});

export interface ActaPoint {
  resolution: string; // negrita
  context: string; // texto normal (puede ir vacío)
}

export interface ActaData {
  dateLabel: string; // "2 de marzo de 2026"
  location: string;
  attendees: string[]; // "Nombre (SIGLA)"
  guests: string[];
  points: ActaPoint[];
  generatedLabel: string;
}

function ActaDocument({ data }: { data: ActaData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          {logoUchile ? (
            <Image style={styles.logoUchile} src={{ data: logoUchile, format: "png" }} />
          ) : (
            <View />
          )}
          {logoFcfm ? (
            <Image style={styles.logoFcfm} src={{ data: logoFcfm, format: "png" }} />
          ) : (
            <View />
          )}
        </View>

        <Text style={styles.org}>Consejo DCC</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Fecha</Text>
          <Text style={styles.metaValue}>{data.dateLabel}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Lugar</Text>
          <Text style={styles.metaValue}>{data.location}</Text>
        </View>
        {data.attendees.length > 0 && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Asisten</Text>
            <Text style={styles.metaValue}>{data.attendees.join(", ")}.</Text>
          </View>
        )}
        {data.guests.length > 0 && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Invitados</Text>
            <Text style={styles.metaValue}>{data.guests.join(", ")}.</Text>
          </View>
        )}

        <Text style={styles.intro}>
          Durante el Consejo del {data.dateLabel}, se abordaron los siguientes puntos:
        </Text>

        {data.points.map((p, i) => (
          <View key={i} style={styles.item} wrap={false}>
            <Text style={styles.itemNumber}>{i + 1}.</Text>
            <Text style={styles.itemBody}>
              <Text style={styles.bold}>{p.resolution}</Text>
              {p.context ? <Text>{p.resolution ? " " : ""}{p.context}</Text> : null}
            </Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          Consejo Departamental · Departamento de Ciencias de la Computación · Universidad de Chile — Generado el {data.generatedLabel}
        </Text>
      </Page>
    </Document>
  );
}

export function renderActaToBuffer(data: ActaData): Promise<Buffer> {
  return renderToBuffer(<ActaDocument data={data} />);
}
