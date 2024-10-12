import React, { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    getKeyValue,
} from "@nextui-org/react";

import { human_readable_byte_size } from "../lib/utils";

function prepare_table_for_total(T, counts) {
    let total = counts.total;
    // {dir_quantity,file_quantity,file_quantity_of_types,file_size_sum,file_size_of_types,file_type_quantity}

    let col_keys = ["count-file.item-name", "count-file.item-value"];
    let columns = [
        {
            key: col_keys[0],
            label: T("app.things.file.count_files.total_sum"),
        },
        { key: col_keys[1], label: "" },
    ];

    let rows = [
        {
            key: "1",
            "count-file.item-name": T(
                "app.things.file.count_files.dir_quantity"
            ),
            "count-file.item-value": total.dir_quantity,
        },
        {
            key: "2",
            "count-file.item-name": T(
                "app.things.file.count_files.file_quantity"
            ),
            "count-file.item-value": total.file_quantity,
        },

        {
            key: "3",
            "count-file.item-name": T(
                "app.things.file.count_files.file_type_quantity"
            ),
            "count-file.item-value": total.file_type_quantity,
        },
        {
            key: "4",
            "count-file.item-name": T("app.things.file.count_files.total_size"),
            "count-file.item-value": `${human_readable_byte_size(
                total.file_size_sum
            )} (${total.file_size_sum} bytes)`,
        },
    ];

    return { columns, rows };
}

function prepare_table_for_paths(T, counts) {
    // paths = counts keys but remove 'total'
    let paths = Object.keys(counts).filter((key) => key !== "total");

    // {dir_quantity,file_quantity,file_quantity_of_types,file_size_sum,file_size_of_types,file_type_quantity}

    let col_keys = [
        "app.things.file.count_files.file_path",
        "app.things.file.count_files.dir_quantity",
        "app.things.file.count_files.file_quantity",
        "app.things.file.count_files.file_size_sum",
    ];

    let columns = [];
    col_keys.forEach((key) => {
        columns.push({ key: key, label: T(`${key}`) });
    });
    columns[0].label = T("app.things.file.count_files.file_path");

    let rows = [];
    paths.forEach((path, index) => {
        let row = {
            key: index,
            "app.things.file.count_files.file_path": path,
            "app.things.file.count_files.dir_quantity":
                counts[path].dir_quantity,
            "app.things.file.count_files.file_quantity":
                counts[path].file_quantity,
            "app.things.file.count_files.file_size_sum": `${human_readable_byte_size(
                counts[path].file_size_sum
            )}`,
        };
        rows.push(row);
    });

    return { columns, rows };
}

function prepare_table_for_file_types(T, counts) {
    let total = counts.total;
    // {dir_quantity,file_quantity,file_quantity_of_types,file_size_sum,file_size_of_types,file_type_quantity}
    // only show total file type counts

    let col_keys = [
        "app.things.file.count_files.file_type",
        "app.things.file.count_files.file_quantity",
        "app.things.file.count_files.total_size",
    ];

    let columns = [];
    col_keys.forEach((key) => {
        columns.push({ key: key, label: T(`${key}`) });
    });

    let rows = [];
    Object.keys(total.file_size_of_types).forEach((ext) => {
        let row = {
            key: ext,
            "app.things.file.count_files.file_type": ext,
            "app.things.file.count_files.file_quantity":
                total.file_quantity_of_types[ext],
            "app.things.file.count_files.total_size": `${human_readable_byte_size(
                total.file_size_of_types[ext]
            )}`,
        };
        rows.push(row);
    });

    return { columns, rows };
}

export default function Component(props) {
    const { T, counts } = props;
    // counts = [{path, dir_quantity, file_quantity, total_size, file_quantity_of_types:{ext:num,}, file_size_of_types:{ext:num,} }]
    const t1 = prepare_table_for_total(T, counts);

    const t2 = prepare_table_for_paths(T, counts);

    const t3 = prepare_table_for_file_types(T, counts);

    return (
        <div className="w-full flex flex-col gap-6">
            <Table className="select-text" aria-label="Count Files - Total">
                <TableHeader columns={t1.columns}>
                    {(column) => (
                        <TableColumn key={column.key}>
                            {column.label}
                        </TableColumn>
                    )}
                </TableHeader>

                <TableBody items={t1.rows}>
                    {(item) => (
                        <TableRow key={item.key}>
                            {(columnKey) => (
                                <TableCell>
                                    {getKeyValue(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <Table className="select-text" aria-label="Count Files - Paths">
                <TableHeader columns={t2.columns}>
                    {(column) => (
                        <TableColumn key={column.key}>
                            {column.label}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody items={t2.rows}>
                    {(item) => (
                        <TableRow key={item.key}>
                            {(columnKey) => (
                                <TableCell>
                                    {getKeyValue(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <Table className="select-text" aria-label="Count Files File Types">
                <TableHeader columns={t3.columns}>
                    {(column) => (
                        <TableColumn key={column.key}>
                            {column.label}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody items={t3.rows}>
                    {(item) => (
                        <TableRow key={item.key}>
                            {(columnKey) => (
                                <TableCell>
                                    {getKeyValue(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
