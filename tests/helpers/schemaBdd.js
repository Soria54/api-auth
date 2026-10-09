/**
 * Compare le schéma validé (`docs/base-de-donnees.md`, diagramme Mermaid erDiagram) aux
 * modèles Sequelize. Utilisé par tests/integration/schemaBdd.test.js.
 */

const TYPES_SEQUELIZE = {
  STRING: 'string',
  TEXT: 'text',
  INTEGER: 'integer',
  DECIMAL: 'decimal',
  BOOLEAN: 'boolean',
  DATEONLY: 'date',
  DATE: 'datetime',
};

const COLONNES_IMPLICITES = new Set(['created_at', 'updated_at']);

const ENTITE = /^\s*([A-Za-z_]\w*)\s*\{\s*$/;
const ATTRIBUT =
  /^\s*(\w+)\s+(\w+)(?:\s+((?:PK|FK|UK)(?:\s*,\s*(?:PK|FK|UK))*))?(?:\s+"([^"]*)")?\s*$/;
const RELATION = /^\s*(\w+)\s+\S*--\S*\s+(\w+)\s*:/;

/** Lit le premier bloc ```mermaid erDiagram : { tables: Map<table, Map<colonne, def>>, relations } */
export const lireSchemaMermaid = (markdown) => {
  const bloc = /```mermaid\s*\n\s*erDiagram\s*\n([\s\S]*?)```/.exec(markdown);
  if (!bloc) throw new Error('aucun bloc ```mermaid erDiagram dans le document');

  const tables = new Map();
  const relations = [];
  let courante = null;

  bloc[1].split('\n').forEach((brute, index) => {
    const ligne = brute.replace(/%%.*$/, '').trim();
    if (!ligne) return;
    if (courante) {
      if (ligne === '}') {
        courante = null;
        return;
      }
      const m = ATTRIBUT.exec(ligne);
      if (!m) throw new Error(`ligne ${index + 1} illisible : « ${ligne} »`);
      const [, type, nom, cles = '', commentaire = ''] = m;
      const liste = cles.split(',').map((c) => c.trim());
      courante.set(nom, {
        type,
        pk: liste.includes('PK'),
        fk: liste.includes('FK'),
        unique: liste.includes('UK'),
        obligatoire: liste.includes('PK') || /obligatoire/i.test(commentaire),
      });
      return;
    }
    const entite = ENTITE.exec(ligne);
    if (entite) {
      courante = new Map();
      tables.set(entite[1], courante);
      return;
    }
    const relation = RELATION.exec(ligne);
    if (relation) relations.push([relation[1], relation[2]]);
  });

  return { tables, relations };
};

/** Liste des écarts entre le schéma lu et les modèles de `db` (vide si conforme). */
export const comparerSchema = ({ tables, relations }, db) => {
  const ecarts = [];
  const modeles = new Map(
    Object.values(db)
      .filter((valeur) => typeof valeur?.getTableName === 'function')
      .map((modele) => [String(modele.getTableName()), modele]),
  );

  tables.forEach((_colonnes, table) => {
    if (!modeles.has(table)) ecarts.push(`${table} : dans le schéma, sans modèle`);
  });

  modeles.forEach((modele, table) => {
    const attendues = tables.get(table);
    if (!attendues) {
      ecarts.push(`${table} : modèle absent du schéma`);
      return;
    }
    const cles = Object.values(modele.associations)
      .filter((a) => a.associationType === 'BelongsTo')
      .map((a) => ({ colonne: a.foreignKey, cible: String(a.target.getTableName()) }));

    const reelles = Object.values(modele.rawAttributes).filter(
      (attribut) => !COLONNES_IMPLICITES.has(attribut.field),
    );
    reelles.forEach((attribut) => {
      const colonne = attribut.field;
      const attendu = attendues.get(colonne);
      if (!attendu) {
        ecarts.push(`${table}.${colonne} : dans le modèle, absente du schéma`);
        return;
      }
      const type = TYPES_SEQUELIZE[attribut.type.key] ?? attribut.type.key;
      if (type !== attendu.type)
        ecarts.push(`${table}.${colonne} : type ${type}, schéma ${attendu.type}`);
      if (Boolean(attribut.primaryKey) !== attendu.pk)
        ecarts.push(`${table}.${colonne} : PK différente`);
      const obligatoire = attribut.allowNull === false || Boolean(attribut.primaryKey);
      if (obligatoire !== attendu.obligatoire) {
        ecarts.push(`${table}.${colonne} : obligatoire différent (modèle ${obligatoire})`);
      }
      if (Boolean(attribut.unique) !== attendu.unique)
        ecarts.push(`${table}.${colonne} : unicité différente`);
      const cle = cles.find((c) => c.colonne === colonne);
      if (attendu.fk && !cle)
        ecarts.push(`${table}.${colonne} : FK sans belongsTo dans associerModeles`);
      if (!attendu.fk && cle) ecarts.push(`${table}.${colonne} : belongsTo sans FK dans le schéma`);
      if (
        cle &&
        !relations.some(([a, b]) => [a, b].includes(table) && [a, b].includes(cle.cible))
      ) {
        ecarts.push(`${table}.${colonne} : relation ${cle.cible} ↔ ${table} absente du diagramme`);
      }
    });
    attendues.forEach((_def, colonne) => {
      if (!reelles.some((attribut) => attribut.field === colonne)) {
        ecarts.push(`${table}.${colonne} : dans le schéma, absente du modèle`);
      }
    });
  });

  return ecarts;
};
