/// <reference path="../types.d.ts" />
// @ts-check

const _ = require('lodash')

/**
 * @type {Rule}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming an identifier after the user-defined list of its `require` statement',
		},
		schema: [
			{ type: 'object' }
		],
		fixable: 'code',
	},
	create: function (context) {
		/**
		 * @type {Array<[string, RegExp]>}
		 */
		const ruleList = Object.entries(context.options?.[0] || [])
			.map(([variableName, requirePath]) => {
				const matcher = requirePath.startsWith('/')
					? new RegExp(requirePath.substring(1, requirePath.lastIndexOf('/'), requirePath.substring(requirePath.lastIndexOf('/') + 1)))
					: new RegExp('^' + _.escapeRegExp(requirePath) + '$')
				return [variableName, matcher]
			})

		return {
			VariableDeclarator: function (root) {
				if (
					!root.init ||
					root.init.type !== 'CallExpression' ||
					root.init.callee.type !== 'Identifier' ||
					root.init.callee.name !== 'require' ||
					root.init.arguments.length === 0
				) {
					return
				}

				const firstArgument = root.init.arguments[0]
				if (firstArgument.type !== 'Literal' || typeof firstArgument.value !== 'string') {
					return
				}

				const actualVariableName = root.id.type === 'Identifier' ? root.id.name : context.sourceCode.getText(root.id)
				const requirePath = firstArgument.value.replace(/\.(c|m)?jsx?$/, '')

				for (const [variableName, requirePathMatcher] of ruleList) {
					if (requirePathMatcher.test(requirePath)) {
						const expectVariableName = /\$\d/.test(variableName)
							? requirePath.replace(requirePathMatcher, variableName)
							: variableName

						if (expectVariableName !== actualVariableName) {
							context.report({
								node: root.id,
								message: `Expected "${actualVariableName}" to be "${expectVariableName}".`,
								fix: fixer => fixer.replaceText(root.id, expectVariableName)
							})
						}

						break
					}
				}
			}
		}
	},
	tests: {
		valid: [
			{
				code: `const AAA = require('aaa')`,
				options: [{ AAA: 'aaa' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const AAA = require('./aaa')`,
				options: [{ 'AAA': '//aaa$/' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const AAA = require('./aaa')`,
				options: [{ 'AAA': '//aaa$/' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const AAA = require('aaa123')`,
				options: [{ 'AAA$1': '/aaa(\d+)/' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const XXX = require('AAA')`,
				options: [{ 'XXX': '/aaa/i' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const XXX = require('xxx')`,
				options: [{ AAA: 'aaa' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const AAA = require('aaa')`,
				options: [{ AAA: '//aaa$' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `const XXX = require('aaa')`,
				options: [{ AAA: 'aaa' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "XXX" to be "AAA".' }],
				output: `const AAA = require('aaa')`,
			},
			{
				code: `const { AAA } = require('aaa')`,
				options: [{ AAA: 'aaa' }],
				languageOptions: { ecmaVersion: 9, sourceType: 'module' },
				errors: [{ message: 'Expected "{ AAA }" to be "AAA".' }],
				output: `const AAA = require('aaa')`,
			},
		]
	}
}
