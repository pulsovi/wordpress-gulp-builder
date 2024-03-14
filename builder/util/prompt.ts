import inquirer from 'inquirer';

export async function prompt (question: string, defaultValue?: string): Promise<string> {
  return await inquirer.prompt({ message: question, name: 'value', default: defaultValue })
    .then(response => response.value);
}
