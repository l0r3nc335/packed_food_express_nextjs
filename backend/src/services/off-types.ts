/**
 * Open Food Facts is crowdsourced: almost every field is optional, and numeric
 * nutriments arrive as either numbers or strings ("6.1"). We therefore keep the
 * raw shape deliberately loose and narrow it inside the mapper.
 */
export type OffProduct = {
  [key: string]: unknown;
  code?: unknown;
  product_name?: unknown;
  generic_name?: unknown;
  brands?: unknown;
  image_url?: unknown;
  image_front_url?: unknown;
  quantity?: unknown;
  categories?: unknown;
  serving_size?: unknown;
  nutriscore_grade?: unknown;
  nutriments?: unknown;
};

export type OffSearchResponse = {
  count?: unknown;
  page?: unknown;
  page_size?: unknown;
  products?: unknown;
};

/** Fields we ask Open Food Facts for; keeps payloads small and predictable. */
export const OFF_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "product_name_nl",
  "product_name_de",
  "product_name_fr",
  "generic_name",
  "generic_name_en",
  "generic_name_nl",
  "generic_name_de",
  "generic_name_fr",
  "brands",
  "image_url",
  "image_front_url",
  "quantity",
  "categories",
  "serving_size",
  "nutriscore_grade",
  "nutriments",
].join(",");
