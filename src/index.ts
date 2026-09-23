#!/usr/bin/env node
import { Command } from 'commander'
import { initCommand } from './commands/init'
import { addCommand } from './commands/add'

const program = new Command()

program.name('dtao').description('Scaffold full-stack projects and reusable feature bricks').version('0.1.0')

program
  .command('init')
  .description('Scaffold a new dtao project')
  .option('--name <name>', 'project name (skips the prompt)')
  .option('--db <db>', 'database to use (mongo)')
  .action(initCommand)

program
  .command('add <components...>')
  .description('Add one or more components to the current project (their real dependencies are added automatically)')
  .option('-y, --yes', 'skip confirmation and auto-start docker compose')
  .action(addCommand)

program.parseAsync(process.argv)
