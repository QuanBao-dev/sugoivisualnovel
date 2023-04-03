const { default: axios } = require("axios");
const express = require("express");
const { nanoid } = require("nanoid");
const router = express.Router();
const VNDB = require("vndb-api");
const tags = require("../data/tags.json");
const vndb = new VNDB(nanoid(), {
  acquireTimeout: 1000,
  encoding: "utf-8",
});

router.get("/", async (req, res) => {
  let { id, title, isLarger, page, isCount, tags, isContainLastPage } =
    req.query;
  isContainLastPage = isContainLastPage === "true";
  let data = {
    filters: [],
    fields:
      "title, description, image.url, image.sexual, image.violence, screenshots.thumbnail, screenshots.url, screenshots.sexual, screenshots.violence,rating, length, length_minutes, length_votes, languages, released, aliases, screenshots.dims",
    count: isCount === "true",
  };
  if (page) data.page = page;
  if (id) {
    data.filters = [
      "and",
      ["id", isLarger ? ">=" : "=", "v" + id],
      ["id", "<=", "v" + (parseInt(id) + 10)],
    ];
  }
  if (title) {
    if (data.filters.length > 0) {
      data.filters.push(["search", "=", title]);
    } else {
      data.filters = ["and", ["search", "=", title]];
    }
  }
  if (tags) {
    const list = tags.split(",").map((v) => "g" + v);
    if (data.filters.length > 0) {
      data.filters.push(...list.map((v) => ["tag", "=", v]));
    } else {
      data.filters = ["and", ...list.map((v) => ["tag", "=", v])];
    }
  }
  try {
    const response = (await axios.post("https://api.vndb.org/kana/vn", data))
      .data;
    if (!isContainLastPage) {
      return res.send({
        message: parseData(response.results),
      });
    }
    res.send({
      message: {
        data: parseData(response.results),
        maxPage: Math.ceil(response.count / 10),
      },
    });
  } catch (error) {
    res.status(404).send({ error });
  }
});

router.get("/tags", (req, res) => {
  const page = req.query.page;
  const q = req.query.q;
  const list = req.query.list;
  const isNormal = req.query.isNormal;
  if (isNormal === "true") {
    if (!list || list === "undefined") {
      return res.send({
        message: [],
      });
    }
    const tagsData = list.split(",").map((v) => {
      const tag = tags.find(({ id }) => id === parseInt(v));
      return { id: tag.id, name: tag.name };
    });
    return res.send({
      message: tagsData,
    });
  }
  const tagsData = tags.map((v) => ({
    name: v.name,
    id: v.id,
    aliases: v.aliases,
  }));
  res.send({
    message: {
      data: tagsData
        .filter(({ name, aliases }) => {
          for (let i = 0; i < aliases.length; i++) {
            if (aliases[i].match(new RegExp(q, "g"))) return true;
          }
          return !!name.match(new RegExp(q, "g"));
        })
        .slice((page - 1) * 10, page * 10)
        .map((v) => ({
          name: v.name,
          id: v.id,
        })),
      last_visible_page: Math.ceil(tagsData.length / 10),
    },
  });
});

router.get("/tags/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const tag = tags.find((v) => v.id === id);
  res.send({
    message: tag,
  });
});

router.get("/random", async (req, res) => {
  try {
    // const response = await vndb.query(`dbstats`);
    const response = (await axios.get("https://api.vndb.org/kana/stats")).data;
    const { vn } = response;
    const randomNumberList = Array.from(Array(4).keys()).reduce((ans, curr) => {
      let randomNumber = Math.ceil(Math.random() * vn);
      while (ans.includes(randomNumber)) {
        randomNumber = Math.ceil(Math.random() * vn);
      }
      ans.push(randomNumber);
      return ans;
    }, []);
    let data = {
      filters: [
        "or",
        ...randomNumberList
          .map((number) => "v" + number)
          .map((id) => ["id", "=", id]),
      ],
      fields:
        "title, description, image.url, image.sexual, image.violence, screenshots.thumbnail, screenshots.url, screenshots.sexual, screenshots.violence,rating, length, length_minutes, length_votes, languages, released, aliases, screenshots.dims",
    };
    const randomVNList = (
      await axios.post("https://api.vndb.org/kana/vn", data)
    ).data;
    res.send({
      message: parseData(randomVNList.results),
    });
  } catch (error) {
    console.log(error);
    res.status(404).send({ error });
  }
});

router.get("/release", async (req, res) => {
  const {
    id,
    released,
    vn,
    producer,
    title,
    original,
    patch,
    freeware,
    doujin,
    type,
    gtin,
    catalog,
    languages,
    platforms,
  } = req.query;
  let string = "";
  if (id) {
    if (string.length > 0) string += " and id = " + id;
    else string = `id = ${id}`;
  }
  if (released) {
    if (string.length > 0) string += " and released = " + released;
    else string = `released = ${released}`;
  }
  if (vn) {
    if (string.length > 0) string += " and vn = " + vn;
    else string = `vn = ${vn}`;
  }
  if (producer) {
    if (string.length > 0) string += " and producer = " + producer;
    else string = `producer = ${producer}`;
  }
  if (title) {
    if (string.length > 0) string += " and title = " + title;
    else string = `title = ${title}`;
  }
  if (original) {
    if (string.length > 0) string += " and original = " + original;
    else string = `original = ${original}`;
  }
  if (patch) {
    if (string.length > 0) string += " and patch = " + patch;
    else string = `patch = ${patch}`;
  }
  if (freeware) {
    if (string.length > 0) string += " and freeware = " + freeware;
    else string = `freeware = ${freeware}`;
  }
  if (doujin) {
    if (string.length > 0) string += " and doujin = " + doujin;
    else string = `doujin = ${doujin}`;
  }
  if (type) {
    if (string.length > 0) string += " and type = " + type;
    else string = `type = ${type}`;
  }
  if (gtin) {
    if (string.length > 0) string += " and gtin = " + gtin;
    else string = `gtin = ${gtin}`;
  }
  if (catalog) {
    if (string.length > 0) string += " and catalog = " + catalog;
    else string = `catalog = ${catalog}`;
  }
  if (languages) {
    if (string.length > 0) string += " and languages = " + languages;
    else string = `languages = ${languages}`;
  }
  if (platforms) {
    if (string.length > 0) string += " and platforms = " + platforms;
    else string = `platforms = ${platforms}`;
  }
  try {
    const response = await vndb.query(
      `get release basic,details,vn,producers (${string})`
    );
    res.send({
      message: response,
    });
  } catch (error) {
    res.status(404).send({ error });
  }
});

router.get("/character", async (req, res) => {
  const { id, name, original, search, vn, traits } = req.query;
  let string = "";
  if (id) {
    if (string.length > 0) string += " and id = " + id;
    else string = `id = ${id}`;
  }
  if (name) {
    if (string.length > 0) string += " and name ~ " + name;
    else string = `name ~ ${name}`;
  }
  if (original) {
    if (string.length > 0) string += " and original ~ " + original;
    else string = `original ~ ${original}`;
  }

  if (search) {
    if (string.length > 0) string += " and search ~ " + search;
    else string = `search ~ ${search}`;
  }

  if (vn) {
    if (string.length > 0) string += " and vn = " + vn;
    else string = `vn = ${vn}`;
  }

  if (traits) {
    if (string.length > 0) string += " and traits = " + traits;
    else string = `traits = ${traits}`;
  }

  try {
    const response = await vndb.query(
      `get character basic,details,traits,meas,vns,voiced,instances (${string})`
    );
    res.send({
      message: response,
    });
  } catch (error) {
    res.status(404).send({ error });
  }
});

router.get("/staff", async (req, res) => {
  const { id, aid, search } = req.query;
  let string = "";

  if (search) {
    if (string.length > 0) string += " and search = " + search;
    else string = `search ~ ${search}`;
  }
  if (id) {
    if (string.length > 0) string += " and id = " + id;
    else string = `id = ${id}`;
  }
  if (aid) {
    if (string.length > 0) string += " and aid = " + aid;
    else string = `aid = ${aid}`;
  }

  try {
    const response = await vndb.query(
      `get staff basic,details,aliases,vns,voiced (${string})`
    );
    res.send({
      message: response,
    });
  } catch (error) {
    res.status(404).send({ error });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const response = (await axios.get("https://api.vndb.org/kana/stats")).data;
    res.send({
      message: response,
    });
  } catch (error) {
    res.status(404).send({ error });
  }
});
router.get("/:vnId/relations", async (req, res) => {
  const vnId = parseInt(req.params.vnId);
  let items = [];
  try {
    items = (await vndb.query(`get vn relations (id = ${vnId})`)).items;
    res.send({
      message: items[0].relations,
    });
  } catch (error) {
    console.log({ error });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  let data = {
    filters: ["id", "=", "v" + id],
    fields:
      "title, description, image.url, image.sexual, image.violence, screenshots.thumbnail, screenshots.url, screenshots.sexual, screenshots.violence,rating, length, length_minutes, length_votes, languages, released, aliases, screenshots.dims",
  };
  try {
    const details = await (
      await axios.post("https://api.vndb.org/kana/vn", data)
    ).data;
    res.send({
      message: parseData(details.results)[0],
    });
  } catch (error) {
    res.status(404).send({ error });
  }
});

function parseData(data) {
  return data.map((data) => {
    return {
      ...data,
      id: parseInt(data.id.match(/[0-9]+/g)[0]),
      image: data.image ? data.image.url : "/nsfw-warning.webp",
      image_nsfw: data.image ? data.image.sexual >= 1 : false,
      rating: (data.rating * 0.1).toFixed(2),
      screens: data.screenshots.map((screenshot) => ({
        ...screenshot,
        nsfw: screenshot.sexual >= 1,
        image: screenshot.url,
        width: screenshot.dims[0],
        height: screenshot.dims[1],
      })),
    };
  });
}

module.exports = router;
