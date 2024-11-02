import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./Home.module.css"; // Asegúrate de tener el archivo de estilo CSS

const Home = () => {
  const [idValue, setIdValue] = useState("");
  const [idType, setIdType] = useState("IDENTIFICACION");
  const [planificacion, setPlanificacion] = useState([]);
  const [notificacionInfo, setNotificacionInfo] = useState(null);
  const [proximoCorte, setProximoCorte] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState("");
  const [horaActual, setHoraActual] = useState(""); // Estado para la hora actual
  const [loading, setLoading] = useState(false); // Estado para controlar la carga

  const handleSelectOption = (option) => {
    setIdType(option);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      const ahora = new Date();
      setHoraActual(ahora.toLocaleTimeString()); // Actualiza la hora cada segundo

      // Calcular el tiempo restante hasta el siguiente corte
      if (proximoCorte) {
        const proximoCorteDate = new Date(proximoCorte.fechaHoraCorte);
        const diferencia = proximoCorteDate - ahora; // Diferencia en milisegundos
        if (diferencia > 0) {
          const horas = Math.floor(
            (diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          const minutos = Math.floor(
            (diferencia % (1000 * 60 * 60)) / (1000 * 60)
          );
          const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
          setTiempoRestante(`${horas}h ${minutos}m ${segundos}s`); // Formato "hh mm ss"
        } else {
          setTiempoRestante("Corte ya iniciado"); // Mensaje si ya ha comenzado el corte
        }
      }
    }, 1000);

    return () => clearInterval(intervalId); // Limpia el intervalo al desmontar el componente
  }, [proximoCorte]); // Se ejecuta cuando proximoCorte cambia

  const fetchData = async () => {
    setLoading(true); // Inicia la carga antes de hacer la solicitud
    try {
      const response = await axios.get(
        `https://api.cnelep.gob.ec/servicios-linea/v1/notificaciones/consultar/${idValue}/${idType}`
      );
      if (response.data.resp === "OK") {
        const notificacion = response.data.notificaciones[0];
        setNotificacionInfo({
          idUnidadNegocios: notificacion.idUnidadNegocios,
          cuentaContrato: notificacion.cuentaContrato,
          alimentador: notificacion.alimentador,
          cuen: notificacion.cuen,
          direccion: notificacion.direccion,
          fechaRegistro: notificacion.fechaRegistro,
        });

        const detalles = notificacion.detallePlanificacion;

        //######################################################-Encuentra el próximo corte más cercano a la fecha y hora actual
        const ahora = new Date();
        const corteCercano = detalles.reduce((proximo, detalle) => {
          const fechaHoraCorte = new Date(detalle.fechaHoraCorte);
          return fechaHoraCorte > ahora &&
            (!proximo || fechaHoraCorte < new Date(proximo.fechaHoraCorte))
            ? detalle
            : proximo;
        }, null);

        setProximoCorte(corteCercano);

        // Calcula el tiempo restante si hay un próximo corte
        if (corteCercano) {
          const fechaHoraCorte = new Date(corteCercano.fechaHoraCorte);
          const tiempo = calcularTiempoRestante(fechaHoraCorte, ahora);
          setTiempoRestante(tiempo);
        } else {
          setTiempoRestante("");
        }

        // Agrupa los cortes por fecha
        const planificacionAgrupada = detalles.reduce((acc, detalle) => {
          const { fechaCorte } = detalle;
          acc[fechaCorte] = acc[fechaCorte] || [];
          acc[fechaCorte].push(detalle);
          return acc;
        }, {});

        setPlanificacion(planificacionAgrupada);
      } else {
        setPlanificacion({});
        setNotificacionInfo(null);
        console.error("Error en la respuesta de la API:", response.data);
      }
    } catch (error) {
      console.error("Error al obtener datos:", error);
      setPlanificacion({});
      setNotificacionInfo(null);
    } finally {
      setLoading(false); // Finaliza la carga independientemente del resultado
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true); // Inicia la carga
    fetchData();
  };

  // Calcula el tiempo restante en formato "HH:mm"
  const calcularTiempoRestante = (fechaCorte, ahora) => {
    const diferencia = fechaCorte - ahora;
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = String(Math.floor((diferencia / 1000) % 60)).padStart(
      2,
      "0"
    );
    return `${horas}:${minutos}:${segundos}`;
  };

  // Función para formatear la fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return "Fecha no disponible";

    // Diccionario para convertir el mes en español al número correspondiente
    const meses = {
      enero: "01",
      febrero: "02",
      marzo: "03",
      abril: "04",
      mayo: "05",
      junio: "06",
      julio: "07",
      agosto: "08",
      septiembre: "09",
      octubre: "10",
      noviembre: "11",
      diciembre: "12",
    };

    const diasSemana = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];

    // Extraemos el día, mes y año utilizando una expresión regular
    const regex = /, (\d{1,2}) de (\w+) de (\d{4})/;
    const match = fecha.match(regex);

    if (!match) return "Fecha inválida";

    const [, dia, mesTexto, año] = match;
    const mesNumero = meses[mesTexto.toLowerCase()];

    if (!mesNumero) return "Fecha inválida";

    // Creamos la fecha en formato "año-mes-dia" para poder calcular el día de la semana
    const fechaFormateada = new Date(`${año}-${mesNumero}-${dia}`);
    const diaSemana = diasSemana[fechaFormateada.getDay()];

    // Construimos la fecha en el formato "día/mes/año"
    return `${diaSemana} - ${dia}/${mesNumero}/${año}`;
  };

  return (
    <div className={styles["container"]}>
      <div className={styles["contenedor-form"]}>
        <h1>Horarios de CNEL</h1>
        <form onSubmit={handleSubmit} className={styles["form"]}>
          <input
            type="text"
            value={idValue}
            onChange={(e) => setIdValue(e.target.value)}
            placeholder="Ingrese su número"
            required
          />

          {/* Select visible solo en escritorio */}
          <select
            value={idType}
            onChange={(e) => setIdType(e.target.value)}
            className={styles.selectDesktopOnly}
          >
            <option value="IDENTIFICACION">Cédula</option>
            <option value="CUENTA_CONTRATO">Código Único</option>
            <option value="CUEN">Cuenta</option>
          </select>

          {/* Botones visibles solo en móviles */}
          <div className={styles.mobileButtonsContainer}>
            <button
              type="button"
              className={idType === "IDENTIFICACION" ? styles.active : ""}
              onClick={() => handleSelectOption("IDENTIFICACION")}
            >
              Cédula
            </button>
            <button
              type="button"
              className={idType === "CUENTA_CONTRATO" ? styles.active : ""}
              onClick={() => handleSelectOption("CUENTA_CONTRATO")}
            >
              Código Único
            </button>
            <button
              type="button"
              className={idType === "CUEN" ? styles.active : ""}
              onClick={() => handleSelectOption("CUEN")}
            >
              Cuenta
            </button>
          </div>

          <button type="submit">Consultar</button>
        </form>
      </div>
      {/* Mostrar mensaje de carga */}
      {loading && <p>Cargando...</p>}{" "}
      {/* Puedes reemplazar esto con un spinner si lo prefieres */}
      {/* Información General de la Notificación */}
      {notificacionInfo && (
        <div className={styles["notificacion-info"]}>
          {/* <p>
            <strong>ID Unidad de Negocios:</strong>{" "}
            {notificacionInfo.idUnidadNegocios}
          </p> */}
          <p>
            <strong>Contrato:</strong> {notificacionInfo.cuentaContrato}
          </p>
          <p>
            <strong>Alimentador:</strong> {notificacionInfo.alimentador}
          </p>
          <p>
            <strong>Cuen:</strong> {notificacionInfo.cuen}
          </p>
          <p>
            <strong>Dirección:</strong> {notificacionInfo.direccion}
          </p>
          <p>
            <strong>Fecha de Registro:</strong> {notificacionInfo.fechaRegistro}
          </p>
        </div>
      )}
      <div className={styles["hora-actual"]}>
        <p>Hora actual</p> {horaActual}
      </div>
      <div className={styles["cards-container"]}>
        {Object.keys(planificacion).length > 0 ? (
          Object.entries(planificacion).map(([fechaCorte, detalles]) => (
            <div className={styles["card"]} key={fechaCorte}>
              <h2>{formatearFecha(fechaCorte)}</h2>{" "}
              {/* Usamos la función para formatear la fecha */}
              {Array.isArray(detalles) &&
                detalles.map((detalle, index) => (
                  <div
                    key={index}
                    className={`${styles["detalle"]} ${
                      proximoCorte &&
                      detalle.fechaHoraCorte === proximoCorte.fechaHoraCorte
                        ? styles["proximo-corte"]
                        : ""
                    }`}
                  >
                    <p>
                      <strong>Horario:</strong> {detalle.horaDesde} -{" "}
                      {detalle.horaHasta}
                    </p>
                    {/* Muestra el tiempo restante si es el próximo corte */}
                    {proximoCorte &&
                      detalle.fechaHoraCorte ===
                        proximoCorte.fechaHoraCorte && (
                        <p>
                          <strong>Tiempo hasta el siguiente corte:</strong>{" "}
                          {tiempoRestante}
                        </p>
                      )}
                  </div>
                ))}
            </div>
          ))
        ) : (
          <p>No hay datos disponibles.</p>
        )}
      </div>
    </div>
  );
};

export default Home;
