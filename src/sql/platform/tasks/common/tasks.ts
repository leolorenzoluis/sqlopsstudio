/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as types from 'vs/base/common/types';
import { TPromise } from 'vs/base/common/winjs.base';
import * as platform from 'vs/platform/registry/common/platform';
import { IJSONSchema, IJSONSchemaMap } from 'vs/base/common/jsonSchema';
import { Action } from 'vs/base/common/actions';
import { IConstructorSignature3, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import * as nls from 'vs/nls';
import { ILocalizedString, IMenuItem, MenuRegistry, ICommandAction } from 'vs/platform/actions/common/actions';
import Event from 'vs/base/common/event';
import { IDisposable } from 'vs/base/common/lifecycle';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IConnectionProfile } from 'sql/parts/connection/common/interfaces';
import { LinkedList } from 'vs/base/common/linkedList';

import * as data from 'data';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';

export interface ITaskOptions {
	id: string;
	title: string;
	iconClass: string;
	description?: ITaskHandlerDescription;
}

export abstract class Task {
	public readonly id: string;
	public readonly title: string;
	public readonly iconClass: string;
	private readonly _description: ITaskHandlerDescription;

	constructor(opts: ITaskOptions) {
		this.id = opts.id;
		this.title = opts.title;
		this.iconClass = opts.iconClass;
		this._description = opts.description;
	}

	private toITask(): ITask {
		return {
			id: this.id,
			handler: (accessor, conn, serverInfo, args) => this.runTask(accessor, conn, serverInfo, args),
			description: this._description
		};
	}

	private toCommandAction(): ICommandAction {
		return {
			iconClass: this.iconClass,
			id: this.id,
			title: this.title
		};
	}

	public registerTask(): IDisposable {
		MenuRegistry.addCommand(this.toCommandAction());
		return TaskRegistry.registerTask(this.toITask());
	}

	public abstract runTask(accessor: ServicesAccessor, conn: data.connection.Connection, serverInfo: data.ServerInfo, args: any): void | TPromise<void>;
}

export interface ITaskHandlerDescription {
	description: string;
	args: { name: string; description?: string; constraint?: types.TypeConstraint; }[];
	returns?: string;
}

export interface ITaskEvent {
	taskId: string;
}

export interface ITaskAction {
	id: string;
	title: string | ILocalizedString;
	category?: string | ILocalizedString;
	iconClass?: string;
	iconPath?: string;
}

export interface ITaskHandler {
	(accessor: ServicesAccessor, conn: data.connection.Connection, serverInfo: data.ServerInfo, ...args: any[]): void;
}

export interface ITask {
	id: string;
	handler: ITaskHandler;
	precondition?: ContextKeyExpr;
	description?: ITaskHandlerDescription;
}

export interface ITaskRegistry {
	registerTask(id: string, command: ITaskHandler): IDisposable;
	registerTask(command: ITask): IDisposable;
	getTasks(): string[];
}

export const TaskRegistry: ITaskRegistry = new class implements ITaskRegistry {

	private _tasks = new Array<string>();

	registerTask(idOrTask: string | ITask, handler?: ITaskHandler): IDisposable {
		let disposable: IDisposable;
		let id: string;
		if (types.isString(idOrTask)) {
			disposable = CommandsRegistry.registerCommand(idOrTask, handler);
			id = idOrTask;
		} else {
			disposable = CommandsRegistry.registerCommand(idOrTask);
			id = idOrTask.id;
		}

		this._tasks.push(id);

		return {
			dispose: () => {
				let index = this._tasks.indexOf(id);
				if (index >= 0) {
					this._tasks = this._tasks.splice(index, 1);
				}
				disposable.dispose();
			}
		};
	}

	getTasks(): string[] {
		return this._tasks;
	}
};
