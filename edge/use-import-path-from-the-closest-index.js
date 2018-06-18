'use strict'

const _ = require('lodash')
const fs = require('fs')
const fp = require('path')

module.exports = {
	meta: {
		docs: {
			description: 'enforce importing the closest index file',
			category: 'ECMAScript 6',
		},
	},
	create: function (context) {
		return {
			ImportDeclaration: function (root) {
				const importRelativePath = root.source.value
				if (importRelativePath.startsWith('.') === false) {
					return null
				}

				const currentFullPath = context.getFilename()
				const importFullPath = getImportFullPath(currentFullPath, importRelativePath)
				if (importFullPath === null) {
					return null
				}

				const supportedExtensions = getSupportedExtensions(importFullPath)

				const repositoryPath = process.cwd()
				const importPartialPathFromRepository = importFullPath.substring(repositoryPath.length)
				const pathList = _.compact(importPartialPathFromRepository.split(/\\|\//))

				for (let count = 1; count <= pathList.length; count++) {
					const workPath = pathList.slice(0, count).join(fp.sep)
					for (const extension of supportedExtensions) {
						const indexFullPath = fp.join(repositoryPath, workPath, 'index' + extension)
						if (fs.existsSync(indexFullPath)) {
							if (currentFullPath.startsWith(fp.dirname(indexFullPath))) {
								return null
							}

							if (indexFullPath !== importFullPath) {
								const unixPath = _.trim(indexFullPath.substring(repositoryPath.length).replace(/\\/, '/'), '/')
								return context.report({
									node: root.source,
									message: `Expected to import "${unixPath}".`,
								})
							}

							break
						}
					}
				}
			}
		}
	},
	getSupportedExtensions,
	getImportFullPath,
}

function getSupportedExtensions(currentFullPath) {
	return fp.extname(currentFullPath) === '.ts'
		? ['.ts', '.tsx', '.js', '.jsx']
		: ['.js', '.jsx', '.ts', '.tsx']
}

function getImportFullPath(currentFullPath, importRelativePath) {
	const supportedExtensions = getSupportedExtensions(currentFullPath)

	const fullPath = fp.resolve(fp.dirname(currentFullPath), importRelativePath)
	if (fp.extname(fullPath) === '') {
		for (const extension of supportedExtensions) {
			if (fs.existsSync(fullPath + extension)) {
				return fullPath + extension
			}
		}
	}

	if (fs.existsSync(fullPath)) {
		if (fs.lstatSync(fullPath).isDirectory()) {
			for (const extension of supportedExtensions) {
				const actualPath = fp.join(fullPath, 'index' + extension)
				if (fs.existsSync(actualPath)) {
					return actualPath
				}
			}

		} else {
			return fullPath
		}
	}

	return null
}
