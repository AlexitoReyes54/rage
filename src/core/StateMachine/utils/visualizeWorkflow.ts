import type { Transition, StateName } from "../types";

// gen by IA
export default function visualizeWorkflow(storage: Map<StateName, Transition[]>) {
	console.log("\n  === WORKFLOW VISUALIZER ===\n");

	storage.forEach((transitions, state) => {
		// Imprimimos el estado origen con un color/estilo resaltado
		console.log(`  [ ${state.toUpperCase()} ]`);

		if (transitions.length === 0) {
			console.log("     └─ (No output transitions)");
		}

		transitions.forEach((t, index) => {
			const isLast = index === transitions.length - 1;
			const connector = isLast ? "└──" : "├──";

			// Construimos la línea: Conector -> Evento -> Estado Destino
			console.log(`     ${connector} (${t.name}) ──▶  ${t.to}`);
		});

		console.log(""); // Espacio entre grupos
	});
}


