export interface IUser {
  id: string;
  usuario: string;
  nombre: string;
  apellido: string;
  password: string;
  pregunta1: string;
  respuesta1: string;
  pregunta2: string;
  respuesta2: string;
  desde: string;
  nivel: number;
  intentos: number;
  confirmpassword?: string;
  [key: string]: any;
}

export interface IPreguntas {
  id: number;
  pregunta: string;
  id_pregunta?: number;
  pregunta1?: number;
  pregunta2?: number;
  usuario?: string;
  id_usuario?: string;
}
