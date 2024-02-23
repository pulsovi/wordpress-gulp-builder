import { fs } from '../util/fs.js';
import { prompt } from '../util/prompt.js';
import { kebabify, pascalify} from '../util/textCase.js';

export async function addSnippet (cb) {
  //const snippetName = await prompt('snippet dirname :');
  const snippetTitle = await prompt('snippet title :');
  const snippetDescription = await prompt('snippet description :');
  const snippetVersion = await prompt('snippet version :');
  const snippetAuthor = await prompt('snippet author :');
  const snippetScope = await prompt(`Scope: Optionel, par défaut vaut 'global'.
  Choix possibles :
    - 'global' pour un snippet PHP executé systèmatiquement,
    - 'content' pour un snippet ajouté via shortcode,
    - 'front-end' pour un snippet désactivé en back-office,
    - 'admin' pour un snippet activé seulement en back-office,
    - 'single-use' pour un snippet à usage unique,
    - ...
  `);
  const snippetClassName = pascalify(snippetTitle);
  const snippetSlug = kebabify(snippetTitle);
  const snippetName = snippetSlug;
  const snippetFilename = `src/snippets/${snippetName}/${snippetName}.php`;
  const snippetDocfile = `src/snippets/${snippetName}/README.md`;

  console.log({ snippetName, snippetTitle, snippetDescription, snippetVersion, snippetAuthor, snippetClassName, snippetSlug, snippetFilename, snippetScope });
  await fs.ensureFile(snippetFilename);
  await fs.writeFile(snippetFilename,
`<?php
/*
 * Snippet Name: ${snippetTitle}
 * Description: ${snippetDescription}
 * Version: ${snippetVersion}
 * Author: ${snippetAuthor}
${snippetScope ? ` * Scope: ${snippetScope}\n`: ''}\
 */
class ${snippetClassName} {
  /**
   * This class is not meant to be instantiated,
   * it only provides static methods
   *
   * @since ${snippetVersion}
   * @access private
   */
  private function __construct () {
    /* prevent external instantiation */
  }

  /**
   * initialize the snippet
   *
   * @since ${snippetVersion}
   * @access public
   */
  public static function init () {

  }
}

add_action('plugins_loaded', [${snippetClassName}::class, 'init']);
`,
  'utf8');

  await fs.ensureFile(snippetDocfile);
  await fs.writeFile(snippetDocfile, `# ${snippetTitle}\n\n${snippetDescription}\n`, 'utf8');
}
