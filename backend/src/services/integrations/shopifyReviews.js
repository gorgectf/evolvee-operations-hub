const env = require('../../config/env');
const { callExternal, withSync, cached } = require('../apiClient');
const sample = require('../sampleData/shopify.json');

function graphqlUrl() {
    return 'https://' + env.shopify.storeDomain + '/admin/api/' + env.shopify.apiVersion + '/graphql.json';
}

function field(node, key) {
    const f = (node.fields || []).find((x) => x.key === key);
    return f ? f.value : null;
}

function referencedSku(node) {
    const edges = node.product && node.product.reference &&
        node.product.reference.variants && node.product.reference.variants.edges;
    return (edges && edges[0] && edges[0].node && edges[0].node.sku) || null;
}

function mapReview(node) {
    return {
        id: node.id,
        rating: Number(field(node, 'rating')) || null,
        body: field(node, 'body') || field(node, 'content') || '',
        author: field(node, 'author') || field(node, 'reviewer') || 'Anonymous',
        created_at: field(node, 'created_at') || field(node, 'review_date') || null,
        state: field(node, 'state') || 'published',
        sku: field(node, 'sku') || referencedSku(node)
    };
}

async function getReviews() {
    const mode = env.modes.shopify;

    return withSync('shopify-reviews', mode, async () => {
        if (mode === 'sample') {
            return sample.reviews || [];
        }

        const query = '{ metaobjects(type: "product_review", first: 250) { edges { node { id fields { key value } product: field(key: "product") { reference { ... on Product { variants(first: 1) { edges { node { sku } } } } } } } } }';

        const data = await callExternal(graphqlUrl(), {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': env.shopify.adminToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
        });

        const edges = (data.data && data.data.metaobjects && data.data.metaobjects.edges) || [];
        return edges.map((e) => mapReview(e.node));
    });
}

module.exports = { getReviews: () => cached('shopify:getReviews', getReviews), mapReview };
