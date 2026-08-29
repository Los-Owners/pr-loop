/**
 * Sin esto —o con el domain mal puesto— la app queda siempre deslogueada y sin
 * ningún error visible. Es el footgun clásico de Convex Auth.
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
