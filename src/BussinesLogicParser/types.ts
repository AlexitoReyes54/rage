
import * as z from "zod";

export const bussinesLogicFile = z.object({
	process: z.array(z.any())
});

export const SlotTypes = z.enum(["string", "number", "boolean"]);
export const StepType = z.enum(["LINK", "COLLECT"]);

export const CollectObject = z.object({
	name: z.string(),
	type: SlotTypes,
	note: z.string().optional(),
	validation: z.string().optional(),
});

export const CollectStep = z.object({
	type: z.literal("COLLECT"),
	collect: CollectObject
});

export const LinkStep = z.object({
	type: z.literal("LINK"),
	link: z.string(), // process id reference
});

export const NextEndStep = z.object({
	type: z.literal("NEXT"),
	next: z.literal("END"),
});

export const Step = z.union([CollectStep, LinkStep, NextEndStep]);
export const Steps = z.array(Step);

export const Conditional = z.object({
	condition: z.string(),
	then: Steps,
	else: Steps,
});

export const Process = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	if: Conditional.optional(),
	steps: Steps,
});


export const ProcessFile = z.object({
	process: z.array(Process),
	ask_before_filling: z.boolean().optional(),
});


export type Workflow = z.infer<typeof ProcessFile>;
export type StepType = z.infer<typeof Step>
export type LinkStepType = z.infer<typeof LinkStep>
export type CollectObj = z.infer<typeof CollectObject>;

export type LINK = "LINK"
export type COLLECT = "COLLECT"
export type UNDEFINED = "UNDEFINED"
export type StepTypeNames = LINK | COLLECT | UNDEFINED
export type SlotTypes = "string" | "number" | "boolean";

export interface Slot {
	type: SlotTypes,
	name: string,
}



