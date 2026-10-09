import { describe, expect, it } from 'vitest';
import { lireSchemaMermaid } from '../helpers/schemaBdd.js';

const DOCUMENT = `
\`\`\`mermaid
erDiagram
  projet ||--o{ tache : "contient"
  projet {
    integer id PK
    string nom UK "obligatoire"
  }
  tache {
    integer id PK
    string titre "obligatoire"
    integer id_projet FK
  }
\`\`\`
`;

describe('lireSchemaMermaid', () => {
  it('lit entités, attributs et relations', () => {
    const { tables, relations } = lireSchemaMermaid(DOCUMENT);
    expect([...tables.keys()]).toEqual(['projet', 'tache']);
    expect(tables.get('projet').get('nom')).toEqual({
      type: 'string',
      pk: false,
      fk: false,
      unique: true,
      obligatoire: true,
    });
    expect(tables.get('tache').get('id_projet').fk).toBe(true);
    expect(tables.get('tache').get('id').obligatoire).toBe(true);
    expect(relations).toEqual([['projet', 'tache']]);
  });

  it('refuse un document sans diagramme', () => {
    expect(() => lireSchemaMermaid('# rien')).toThrow(/erDiagram/);
  });

  it('signale une ligne illisible', () => {
    expect(() =>
      lireSchemaMermaid('```mermaid\nerDiagram\n  t {\n    pas un attribut valide ici\n  }\n```'),
    ).toThrow(/illisible/);
  });
});
