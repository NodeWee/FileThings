import {
    BsBan,
    BsCheckCircle,
    BsFile,
    BsFolder2Open,
    BsXSquare,
} from "react-icons/bs";
import {
    Button,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    getKeyValue,
} from "@nextui-org/react";
import React, { useEffect, useState } from "react";

import BarTaskCounter from "./BarTaskCounter";
import { locate_paths } from "../../../lib/actions";

export default function Component(props) {
    const { T, taskResult } = props;

    if (!taskResult) {
        return null;
    }

    const path_results = taskResult.path_results;

    if (!path_results || path_results.length === 0) {
        return null;
    }

    // path_results [{status, src_path, dest_paths, message, output},...]
    // const task_counter = taskResult.task_counter;
    // task_counter:{path_not_exist, dir, dir_error, file, file_ok, file_error, file_ignored}
    const task_counter = {
        path: 0,
        path_ok: 0,
        path_error: 0,
        path_ignore: 0,
    };

    const field_keys = [
        "app.result.detail.file.serial",
        "app.result.detail.file.status",
        "app.result.detail.file.source",
        "app.result.detail.file.target",
        "app.result.detail.file.message",
    ];
    var columns = [];
    field_keys.forEach((key) => {
        columns.push({ key: key, label: T(`${key}`) });
    });
    var rows = [];
    path_results.forEach((item, index) => {
        task_counter.path += 1;
        if (item.status === "ok") {
            task_counter.path_ok += 1;
        } else if (item.status === "error") {
            task_counter.path_error += 1;
        } else if (item.status === "ignored") {
            task_counter.path_ignore += 1;
        }

        var row = {
            key: index.toString(),
            "app.result.detail.file.serial": index + 1,
            "app.result.detail.file.status": item.status.toLowerCase(),
            "app.result.detail.file.source": item.rel_src_path || item.src_path,
            "app.result.detail.file.target":
                item.rel_dest_paths || item.dest_paths,
            "app.result.detail.file.message": T(item.message),
        };
        rows.push(row);
    });

    function CellContent({ item, columnKey }) {
        var val = getKeyValue(item, columnKey);
        if (!val) {
            return "";
        }

        if (columnKey === "app.result.detail.file.status") {
            if (val === "ok") {
                return taskResult.dry_run ? "✓" : <BsCheckCircle size={14} />;
            } else if (val === "ignored") {
                return <BsBan size={14} />;
            } else {
                return <BsXSquare size={14} />;
            }
        }

        if (columnKey === "app.result.detail.file.source") {
            // make src_path clickable
            return (
                <a
                    href="#"
                    onClick={() => {
                        locate_paths([val]);
                    }}
                >
                    {val}
                </a>
            );
        }
        if (columnKey === "app.result.detail.file.target") {
            // iter dest_paths and make each clickable
            return (
                <div className="flex flex-col">
                    {val.map((dest_path, index) => (
                        <div
                            className="flex flex-row items-center gap-1"
                            key={index}
                        >
                            <span>{dest_path}</span>
                            <Button
                                onClick={() => {
                                    locate_paths([dest_path]);
                                }}
                                radius="full"
                                variant="light"
                                size="sm"
                                isIconOnly
                            >
                                <BsFolder2Open size={12} />
                            </Button>
                        </div>
                    ))}
                </div>
            );
        }

        // default
        return val;
    }

    return (
        <div className="flex flex-col gap-8 items-center justify-center pb-4">
            <BarTaskCounter task_counter={task_counter} {...props} />

            {rows?.length > 0 && (
                <>
                    <Table aria-label="File Details" className="select-text">
                        <TableHeader columns={columns}>
                            {(column) => (
                                <TableColumn key={column.key}>
                                    {column.label}
                                </TableColumn>
                            )}
                        </TableHeader>
                        <TableBody items={rows}>
                            {(item, index) => (
                                <TableRow
                                    key={item.key}
                                    className={`${
                                        item[
                                            "app.result.detail.file.status"
                                        ] === "error"
                                            ? "text-error"
                                            : ""
                                    }`}
                                >
                                    {(columnKey) => (
                                        <TableCell
                                            key={`${columnKey}-${item.key}-${index}`}
                                            className={`${
                                                columnKey ===
                                                "app.result.detail.file.serial"
                                                    ? " opacity-50"
                                                    : ""
                                            }`}
                                        >
                                            <div
                                                key={`${columnKey}-${item.key}-${index}-content`}
                                            >
                                                <CellContent
                                                    item={item}
                                                    columnKey={columnKey}
                                                />
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </>
            )}
        </div>
    );
}
