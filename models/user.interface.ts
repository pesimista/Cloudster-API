export interface IUser {
   usuario: string;
   nombre: string;
   apellido: string;
   password: string;
   pregunta1: string;
   respuesta1: string;
   pregunta2: string;
   respuesta2: string;
   desde: string;
   nivel?: number;
   intentos?: number;
}