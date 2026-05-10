interface Props {
  onClose: () => void;
}

export function Disclaimer({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-6 max-w-lg w-full border border-gray-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-red-400">⚠️ Disclaimer Legal</h2>

        <div className="space-y-3 text-sm text-gray-300 max-h-96 overflow-y-auto">
          <p>
            <strong className="text-white">NADA DE LO QUE SE PUBLICA AQUÍ ES CONSEJO FINANCIERO.</strong>
          </p>
          <p>
            Este servicio genera señales de trading basadas en análisis técnico y datos de mercado
            (funding rates, RSI, EMA, estructura de mercado). NO garantizamos rentabilidad.
          </p>
          <p>
            <strong>Riesgos del trading con apalancamiento:</strong>
            El trading con apalancamiento (especialmente 3x-5x) puede resultar en pérdidas
            significativas o totales del capital invertido. Un movimiento adverso del 2-3% del precio
            puede significar una pérdida del 10-25% con apalancamiento.
          </p>
          <p>
            <strong>Resultados pasados no garantizan resultados futuros:</strong>
            El rendimiento histórico de las señales no es indicador de rendimiento futuro.
            El mercado de criptomonedas es extremadamente volátil.
          </p>
          <p>
            <strong>Responsabilidad:</strong>
            El usuario es el único responsable de sus decisiones de trading.
            Neither this service nor its creators can be held liable for any financial losses.
          </p>
          <p>
            <strong>Solo para propósitos educativos:</strong>
            Utilice estas señales como herramienta de aprendizaje y análisis,
            no como consejo de inversión automatizado.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold"
        >
          Entiendo los riesgos — continuar
        </button>
      </div>
    </div>
  );
}