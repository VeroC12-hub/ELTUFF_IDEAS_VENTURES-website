-- One-time cleanup: clear out all invoices (test retail sales + any prior
-- wholesale invoices), per explicit request. invoice_items cascades from
-- invoices, but deleted explicitly here for clarity.
DELETE FROM eltuff.invoice_items;
DELETE FROM eltuff.invoices;
