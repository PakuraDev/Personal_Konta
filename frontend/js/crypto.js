/**
 * Lógica de Autenticación y Criptografía Nativa del Dispositivo
 */

const TOKEN_KEY = 'konta_device_token';

// Genera un token nuevo o recupera el existente en localStorage 
export async function getOrCreateDeviceToken() { 
    // 1. Abrimos el cajón a ver si ya hay un DNI guardado
    let token = localStorage.getItem(TOKEN_KEY);
    
    // 2. Si NO hay token (es la primera vez que el usuario entra)...
    if (!token) {
        // ... encendemos la máquina criptográfica y creamos un UUID v4 inquebrantable
        token = crypto.randomUUID(); 
        
        // ... y lo guardamos en el cajón para las próximas veces
        localStorage.setItem(TOKEN_KEY, token);
    }
    
    // 3. ¡MUY IMPORTANTE! Le entregamos el token a la aplicación
    return token;
}

// Para cuando el usuario decida "Cerrar sesión" y borrar su huella
export function clearDeviceToken() {
    localStorage.removeItem(TOKEN_KEY);
    // Nota: Mencionaste que a lo mejor no querías borrar este número por si acaso.
    // Si prefieres mantenerlo siempre, simplemente no usaremos esta función al cerrar sesión, 
    // y borraremos solo la URL del worker y el nombre de usuario.
}