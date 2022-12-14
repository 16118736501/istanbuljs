'use strict';
/* globals describe, it */

const assert = require('chai').assert;
const Context = require('../lib/context');
const ReportBase = require('../lib/report-base');
const FileWriter = require('../lib/file-writer');
const { multiDir } = require('./helpers/coverage-map');

describe('ReportBase', () => {
    it('has basic functionality', () => {
        const r = new ReportBase();
        assert.ok(r);

        const reached = {};
        const context = {
            getTree() {
                assert.strictEqual(this, context);
                reached.getTree = true;
                const getTree = {
                    visit(report, visitContext) {
                        assert.strictEqual(this, getTree);
                        assert.strictEqual(report, r);
                        assert.strictEqual(visitContext, context);
                        reached.visit = true;
                    }
                };
                return getTree;
            }
        };
        r.execute(context);
        assert.ok(reached.getTree);
        assert.ok(reached.visit);
    });

    it('works with real context', () => {
        const coverageMap = multiDir();
        const context = new Context({ coverageMap });
        const tree = context.getTree();
        const cw = context.writer.writeFile(null);

        class TestReport extends ReportBase {
            onStart(root, c) {
                cw.println('[');
                assert.strictEqual(root, tree.root);
                assert.strictEqual(c, context);
            }

            onSummary(node, c) {
                cw.println(
                    `["onSummary", ${JSON.stringify(node.path.toString())}],`
                );
                assert.strictEqual(c, context);
            }

            onDetail(node, c) {
                cw.println(
                    `["onDetail", ${JSON.stringify(node.path.toString())}],`
                );
                assert.strictEqual(c, context);
            }

            onEnd(root, c) {
                cw.println('null]');
                assert.strictEqual(root, tree.root);
                assert.strictEqual(c, context);
            }
        }
        FileWriter.startCapture();
        const r = new TestReport();
        r.execute(context);
        FileWriter.stopCapture();
        const content = FileWriter.getOutput();
        assert.match(content, /onSummary/);
        assert.match(content, /lib1\/file4\.js/);
        assert.match(content, /onDetail/);
        assert.match(content, /lib2\/sub1\/file2.js/);
        FileWriter.resetOutput();
    });
});
