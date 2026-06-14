/**
 * Clasificación de sentimiento de noticias con un LLM (Claude Haiku 4.5).
 *
 * Sustituye la heurística de palabras clave (que falla con ironía, negaciones y
 * contexto, p. ej. "Bitcoin cae y los analistas ven oportunidad" → negativo).
 * Se clasifican todos los titulares en UNA sola llamada (clasificación por lotes)
 * para minimizar coste y latencia.
 *
 * Nota de arquitectura: la llamada se hace directamente desde el navegador con
 * `dangerouslyAllowBrowser`, coherente con cómo el resto de la app ya consume
 * APIs con claves en el navegador (Binance, Alpaca, RapidAPI). Esto expone la
 * clave en el cliente; al mover los bots a un backend (punto 7) esta llamada
 * debería migrar también al servidor.
 */
import Anthropic from '@anthropic-ai/sdk';

export interface HeadlineInput {
  headline: string;
  content?: string;
}

const SYSTEM_PROMPT =
  'Eres un analista financiero experto. Para cada titular, evalúa su impacto en el ' +
  'precio del activo mencionado y asigna un score de sentimiento de mercado entre ' +
  '-1.0 (muy bajista) y 1.0 (muy alcista). 0 = neutral o irrelevante para el precio. ' +
  'Ten en cuenta la ironía, las negaciones y el contexto, no solo palabras sueltas. ' +
  'Una caída ya descontada o una noticia vista como oportunidad de compra no es ' +
  'necesariamente bajista. Responde solo con los scores solicitados.';

// Esquema de salida estructurada: garantiza un JSON con un score por índice.
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          i: { type: 'integer' },
          score: { type: 'number' },
        },
        required: ['i', 'score'],
      },
    },
  },
  required: ['results'],
} as const;

/**
 * Devuelve un array de scores en [-1, 1] alineado por índice con `items`.
 * Lanza si falta la clave o si la API falla, para que el llamador haga fallback
 * a la heurística de palabras clave.
 */
export async function classifyNewsSentiment(
  items: HeadlineInput[],
  apiKey: string
): Promise<number[]> {
  if (!apiKey) throw new Error('Falta la API key de Anthropic');
  if (items.length === 0) return [];

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const numbered = items
    .map((it, i) => {
      const extra = it.content ? ` — ${it.content.slice(0, 160)}` : '';
      return `${i}. ${it.headline}${extra}`;
    })
    .join('\n');

  // output_config es una adición reciente del SDK; el cast evita fricción de
  // tipos si la versión instalada aún no lo expone en sus typings.
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Clasifica el sentimiento de estos ${items.length} titulares y devuelve un score por cada índice:\n\n${numbered}`,
      },
    ],
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('La respuesta del modelo no contiene texto');
  }

  const parsed = JSON.parse(textBlock.text) as { results?: { i: number; score: number }[] };
  const scores = new Array<number>(items.length).fill(0);

  for (const r of parsed.results || []) {
    if (
      typeof r.i === 'number' &&
      r.i >= 0 &&
      r.i < items.length &&
      typeof r.score === 'number' &&
      !Number.isNaN(r.score)
    ) {
      scores[r.i] = Math.max(-1, Math.min(1, r.score)); // acotar a [-1, 1]
    }
  }

  return scores;
}
