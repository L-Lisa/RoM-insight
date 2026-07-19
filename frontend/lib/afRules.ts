// AF:s regelverk — verifiera vid varje AF-släpp.
// Enda stället AF:s tröskelvärden får stå i prosa-nära kod; importera härifrån.

/** Betygströskeln: minst så här många deltagare under mätperioden krävs för betyg. */
export const AF_RATING_MIN_PARTICIPANTS = 18;

/** Betygströskeln: minst så här många månaders verksamhet krävs för betyg. */
export const AF_RATING_MIN_MONTHS = 12;

/** Hävningskriteriet: viktat resultatmått under detta värde. */
export const AF_TERMINATION_THRESHOLD = 0.2;

/** Hävningsprövningen omfattar endast avtal aktiva i minst så här många månader. */
export const AF_TERMINATION_MIN_MONTHS = 22;

/** Tröskeln som svensk prosa: "0,2". Medveten strängersättning i stället för
 *  toLocaleString — små-ICU-runtimes skulle annars tyst ge "0.2". */
export const AF_TERMINATION_THRESHOLD_LABEL = AF_TERMINATION_THRESHOLD.toString().replace(".", ",");
