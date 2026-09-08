import { RadialGauge } from "./RadialGauge";
import { StatTile } from "./StatTile";

export function DashboardHeader() {
  return (
    <div className="dashboard-header">
      <StatTile label="Horas Estudiadas" value="42.6" delta="+6.3h esta semana" />
      <StatTile label="Preguntas Respondidas" value="512" delta="+87 esta semana" />
      <StatTile label="% Correcto Promedio" value="78%" delta="+6% esta semana" />
      <StatTile label="Conceptos Dominados" value="146" delta="+12 total" />
      <RadialGauge label="Exam Readiness" value={76} caption="Listo para el examen" />
    </div>
  );
}
