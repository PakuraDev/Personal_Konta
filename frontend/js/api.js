/**
 * Lógica pura de comunicación con los Workers de Cloudflare
 */

// ==========================================
// FUNCIÓN DE AYUDA (INTERNA)
// ==========================================

// Limpia las URLs de entrada del usuario para evitar dobles barras // destructivas
function limpiarURLBase(urlRaw) {
    if (!urlRaw) return "";
    return urlRaw.replace(/\/+$/, ''); // Elimina barras finales
}

// Envuelve el fetch nativo para inyectar siempre el Token de Seguridad y manejar errores
async function fetchSeguro(url, opciones = {}, deviceToken) {
    const headers = {
        'Content-Type': 'application/json',
        'X-Device-Token': deviceToken, 
        ...opciones.headers
    };

    const config = { ...opciones, headers };

    try {
        const respuesta = await fetch(url, config);
        
        // Si no es un 2xx, es un error de lógica del Worker o de permisos
        if (!respuesta.ok) {
            const data = await respuesta.json().catch(() => ({}));
            throw new Error(data.error || `Error HTTP ${respuesta.status}`);
        }

        return await respuesta.json();

    } catch (error) {
        console.error(`Fallo de red o del Worker al llamar a ${url}:`, error);
        throw error;
    }
}

// ==========================================
// ENDPOINTS DEL WORKER-DB (Configuración)
// ==========================================
export async function initDatabase(urlWorkerSchema, usuarios, presupuestoBase) {
    // Esta no usa fetchSeguro porque al crear la DB aún no exigimos token validado
    const respuesta = await fetch(urlWorkerSchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: usuarios, baseBudget: presupuestoBase })
    });
    
    const data = await respuesta.json();
    if (!respuesta.ok || !data.success) {
        throw new Error(data.error || 'Error al comunicarse con el Worker-DB');
    }
    return data;
}

// ==========================================
// ENDPOINTS DEL WORKER-API (El Motor Financiero)
// ==========================================

export async function obtenerPresupuesto(urlApi, weekId, deviceToken) {
    try {
        const baseUrl = limpiarURLBase(urlApi);
        const url = `${baseUrl}/api/budget?weekId=${encodeURIComponent(weekId)}`;
        const data = await fetchSeguro(url, { method: 'GET' }, deviceToken);
        return data.budget; 
    } catch (error) {
        console.error("Error al obtener presupuesto:", error);
        throw error;
    }
}

export async function obtenerGastos(urlApi, timestampInicio, timestampFin, deviceToken) {
    try {
        const baseUrl = limpiarURLBase(urlApi);
        const url = `${baseUrl}/api/expenses?start=${timestampInicio}&end=${timestampFin}`;
        const data = await fetchSeguro(url, { method: 'GET' }, deviceToken);
        
        // Ahora el servidor devuelve 'concepto' y 'precio' directamente
        return data.expenses;
    } catch (error) {
        console.error("Error al obtener gastos:", error);
        throw error;
    }
}

export async function añadirGasto(urlApi, gasto, deviceToken) {
    try {
        const baseUrl = limpiarURLBase(urlApi);
        const url = `${baseUrl}/api/expenses`;
        const opciones = {
            method: 'POST',
            body: JSON.stringify({
                concepto: gasto.concepto,
                descripcion: gasto.descripcion || "",
                precio: parseFloat(gasto.precio),
                timestamp: gasto.timestamp
            })
        };

        const data = await fetchSeguro(url, opciones, deviceToken);
        return data.success; // Retorna true si todo fue bien
    } catch (error) {
        console.error("Error al añadir el gasto:", error);
        throw error;
    }
}
export async function borrarGasto(urlApi, idGasto, deviceToken) {
    try {
        const baseUrl = limpiarURLBase(urlApi);
        const url = `${baseUrl}/api/expenses/${idGasto}`;
        const data = await fetchSeguro(url, { method: 'DELETE' }, deviceToken);
        return data.success;
    } catch (error) {
        console.error("Error al borrar el gasto:", error);
        throw error;
    }
}

export async function editarGasto(urlApi, idGasto, gasto, deviceToken) {
    try {
        const baseUrl = limpiarURLBase(urlApi);
        const url = `${baseUrl}/api/expenses/${idGasto}`;
        const opciones = {
            method: 'PUT',
            body: JSON.stringify({
                concepto: gasto.concepto,
                descripcion: gasto.descripcion || "",
                precio: parseFloat(gasto.precio),
                timestamp: gasto.timestamp
            })
        };
        const data = await fetchSeguro(url, opciones, deviceToken);
        return data.success;
    } catch (error) {
        console.error("Error al editar el gasto:", error);
        throw error;
    }
}

export async function login(urlApi, username, deviceToken) {
    try {
        const baseUrl = limpiarURLBase(urlApi);
        const url = `${baseUrl}/api/login`;
        const respuesta = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, deviceToken })
        });
        
        const data = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(data.error || `Error en login: ${respuesta.status}`);
        }
        return data;
    } catch (error) {
        console.error("Error en login:", error);
        throw error;
    }
}

export async function guardarPresupuesto(urlApi, weekId, amount, deviceToken) {
    try {
        const baseUrl = limpiarURLBase(urlApi);
        const url = `${baseUrl}/api/budget`;
        const opciones = {
            method: 'POST',
            body: JSON.stringify({ weekId, precio: parseFloat(amount) })
        };
        const data = await fetchSeguro(url, opciones, deviceToken);
        return data.success;
    } catch (error) {
        console.error("Error al guardar presupuesto:", error);
        throw error;
    }
}
