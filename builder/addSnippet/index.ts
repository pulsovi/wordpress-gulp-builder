import { fs } from '../util/fs';
import { prompt } from '../util/prompt';
import { kebabify, pascalify} from '../util/textCase';

export async function addSnippet (cb) {
  //const snippetName = await prompt('snippet dirname :');
  const snippetTitle = await prompt('snippet title :');
  const snippetDescription = await prompt('snippet description :');
  const snippetVersion = await prompt('snippet version :');
  const snippetAuthor = await prompt('snippet author :');
  const snippetScope = await prompt("Scope: Optionel, par défaut vaut 'global', autres choix possibles : 'content' pour un snippet ajouté via shortcode, 'front-end' pour un snippet désactivé en back-office, ...");
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
   * initialize the snippet
   *
   * @since ${snippetVersion}
   * @access public
   */
  static function init () {

  }
}

add_action('plugins_loaded', [${snippetClassName}::class, 'init']);
`,
  'utf8');

  await fs.ensureFile(snippetDocfile);
  await fs.writeFile(snippetDocfile, `# ${snippetTitle}\n\n${snippetDescription}\n`, 'utf8');
}
