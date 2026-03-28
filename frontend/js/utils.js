/**
 * Utilidades para fechas y cálculos del motor financiero
 */

// 1. Calcula el ID de la semana (Ej: "2026-W13") empezando en Lunes.
export function getWeekId(timestamp = Date.now()) {
    const date = new Date(timestamp);

    // Ajustamos para que el Lunes sea el primer día de la semana
    const dayNum = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - dayNum + 3);

    const firstThursday = date.getTime();

    // Bug #8: Guardamos el año ISO ANTES de mutar el objeto.
    // En semanas de cambio de año (ej: 29 Dic 2025 = semana 1 de 2026),
    // el año puede ser diferente del año en que cae el día original.
    const isoYear = date.getFullYear();

    date.setMonth(0, 1);

    if (date.getDay() !== 4) {
        date.setMonth(0, 1 + ((4 - date.getDay()) + 7) % 7);
    }

    const weekNum = 1 + Math.ceil((firstThursday - date) / 604800000);
    return `${isoYear}-W${weekNum.toString().padStart(2, '0')}`;
}

// 2. Formatea el timestamp para la UI (Ej: "Jueves, 26 de Marzo")
export function formatearFechaUI(timestamp) {
    const date = new Date(timestamp);

    // Usamos la API nativa Intl para formatear en español, puro Vanilla
    const formateador = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    let texto = formateador.format(date);
    // Capitalizamos la primera letra ("jueves" -> "Jueves")
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// 3. Formateador de moneda (Ej: 245.34 -> "245,34 €")
export function formatearDinero(cantidad) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(cantidad);
}

// 4. Obtiene el timestamp de inicio (Lunes 00:00) y fin (Domingo 23:59) de una semana
export function getLimitesSemana(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const day = date.getDay();
    // Ajuste para que el Lunes sea el primer día (0 = Domingo en JS nativo)
    const diffToMonday = (day === 0 ? -6 : 1) - day;

    // Bug #9: Creamos una copia limpia en lugar de mutar el objeto 'date'.
    // Usamos UTC midnight para evitar problemas con horario de verano.
    const start = new Date(date);
    start.setDate(date.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { inicio: start.getTime(), fin: end.getTime() };
}