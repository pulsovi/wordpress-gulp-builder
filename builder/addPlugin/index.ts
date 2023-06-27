import { fs } from '../util/fs';
import { prompt } from '../util/prompt';

export async function addPlugin (cb) {
  //const pluginName = await prompt('plugin dirname :');
  const pluginTitle = await prompt('plugin title :');
  const pluginDescription = await prompt('plugin description :');
  const pluginVersion = await prompt('plugin version :');
  const pluginAuthor = await prompt('plugin author :');
  const pluginClassName = pascalify(pluginTitle);
  const pluginSlug = kebabify(pluginTitle);
  const pluginName = pluginSlug;
  const pluginFilename = `src/plugins/${pluginName}/${pluginName}.php`;
  const pluginDocfile = `src/plugins/${pluginName}/README.md`;

  console.log({ pluginName, pluginTitle, pluginDescription, pluginVersion, pluginAuthor, pluginClassName, pluginSlug, pluginFilename });
  await fs.ensureFile(pluginFilename);
  await fs.writeFile(pluginFilename,
`<?php
/*
 * Plugin Name: ${pluginTitle}
 * Description: ${pluginDescription}
 * Version: ${pluginVersion}
 * Author: ${pluginAuthor}
 * Text Domain: ${pluginSlug}
 * Domain Path: /languages
 */
class ${pluginClassName} {
  /**
   * initialize the plugin
   *
   * @since ${pluginVersion}
   * @access public
   */
  static function init () {

  }
}

add_action('plugins_loaded', [${pluginClassName}::class, 'init']);
`,
  'utf8');

  await fs.ensureFile(pluginDocfile);
  await fs.writeFile(pluginDocfile, `# ${pluginTitle}\n\n${pluginDescription}\n`, 'utf8');
}

/**
 * Convert text to Pascal Case string
 */
function pascalify (text: string): string {
  return text
    .replace(/(?<=\b|[a-z])([A-Z])/gu, ' $1')
    .toLowerCase()
    .replace(/(?<=^|[-_ ])([a-z])/gu, (match, capture) => capture.toUpperCase())
    .replace(/[ -_]/gu, '');
}

/** Convert text to kebab case string */
function kebabify (text: string): string {
  return text
    .replace(/(?<=\b|[a-z])([A-Z])/gu, ' $1')
    .toLowerCase()
    .replace(/^[- _]*/, '')
    .replace(/[- _]*$/, '')
    .replace(/([-_ ]+)/gu, '-');
}
