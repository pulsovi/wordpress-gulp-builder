import inquirer from 'inquirer';

export async function prompt (question: string): Promise<string> {
  return await inquirer.prompt({ message: question, name: 'value' })
    .then(response => response.value);
}
