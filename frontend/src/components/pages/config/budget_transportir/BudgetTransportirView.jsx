import React, { useState, useEffect } from "react";
import { withRouter } from "react-router-dom";
import { PageContainer } from "components/layout";
import { SpinnerOverlay, SyncOverlay } from "components";
import { Row, Col, Form, Table, Button, Input, message, Modal } from "antd";
import { api } from "api";
import { useTranslation } from "react-i18next";
import utils from "utils";
import configs from "configs";
import { SearchOutlined } from "@ant-design/icons";
import ModalBudgetTransportirCreate from "./ModalBudgetTransportirCreate";
import ModalBudgetTransportirEdit from "./ModalBudgetTransportirEdit";
import constant from "constant";

const BudgetTransportirView = (props) => {
  const [t] = useTranslation();
  const userInfo = utils.getUserInfo();

  const pageSize = configs.pageSize.master.budget_transportir;

  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [budgetTransportirs, setBudgetTransportirs] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  // modal
  const [modalCreateShow, setModalCreateShow] = useState(false);
  const [modalEditShow, setModalEditShow] = useState(false);
  const [modalEditId, setModalEditId] = useState(null);

  useEffect(() => {
    loadBudgetTransportirs();
  }, [search, pageNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFinish = (values) => {
    setSearch(values.search);
  };

  const loadBudgetTransportirs = () => {
    setPageLoading(true);
    api.master.budget_transportir
      .list(pageSize, pageNumber)
      .then(function (response) {
        const rsBody = response.data.rs_body;
        setBudgetTransportirs(rsBody.budget_transportirs);
        setTotalData(rsBody.total);
      })
      .catch(function (error) {
        utils.swal.Error({ msg: utils.getErrMsg(error) });
      })
      .finally(function () {
        setPageLoading(false);
      });
  };

  const dataSource = [];

  if (budgetTransportirs) {
    for (let i = 0; i < budgetTransportirs.length; i++) {
      const user = budgetTransportirs[i];
      dataSource.push({
        key: i + 1,
        ...user,
      });
    }
  }

  const columns = [
    {
      title: t("termsOfHandover"),
      dataIndex: "terms_of_handover",
      key: "terms_of_handover",
      render: (v) => constant.TERMS_OF_HANDOVER_MAP[v],
    },
    {
      title: t("handoverLocation"),
      dataIndex: "hOver_loc",
      key: "hOver_loc",
      render: (v) => v.name,
    },
    {
      title: t("warehouse"),
      dataIndex: "whs",
      key: "whs",
      render: (v) => `${v.warehouse_id} - ${v.name}`,
    },
    utils.getNumericCol(t("budget"), "budget"),

    {
      title: t("action"),
      dataIndex: "action",
      key: "action",
      render: (_, h) => {
        return (
          <>
            {utils.renderWithPermission(
              userInfo.permissions,
              <Button
                className="mr-2"
                onClick={() => {
                  setModalEditShow(true);
                  setModalEditId(h.id);
                }}
              >
                {t("edit")}
              </Button>,
              // "budget_transportir@edit",
            )}
            {utils.renderWithPermission(
              userInfo.permissions,
              <Button
                type="danger"
                onClick={() => {
                  Modal.confirm({
                    ...constant.MODAL_CONFIRM_DANGER_PROPS,
                    content: t("swalConfirmDelete"),
                    onOk: () => {
                      setPageLoading(true);
                      api.master.budget_transportir
                        .delete(h.id)
                        .then(function (response) {
                          loadBudgetTransportirs();
                          message.success(
                            `${t("budgetTransportir")} ${t("toastSuffixSuccess")} ${t(
                              "toastDeleted",
                            )}`,
                          );
                        })
                        .catch(function (error) {
                          utils.swal.Error({ msg: utils.getErrMsg(error) });
                        })
                        .finally(function () {
                          setPageLoading(false);
                        });
                    },
                  });
                }}
              >
                {t("delete")}
              </Button>,
              // "budget_transportir@delete",
            )}
          </>
        );
      },
    },
  ];

  const onTableChange = (pagination, filters, sorter, extra) => {
    setPageNumber(pagination.current);

    console.log("pagination: ", pagination);
    console.log("filters: ", filters);
    console.log("sorter: ", sorter);
    console.log("extra: ", extra);
  };

  return (
    <PageContainer
      title={t("budgetTransportir")}
      additionalAction={
        <Button
          size="small"
          onClick={() => {
            setModalCreateShow(true);
          }}
        >
          {`${t("add")} ${t("budgetTransportir")}`}
        </Button>
      }
      breadcrumbs={[
        {
          text: t("config"),
          link: "/config",
        },
        {
          text: t("budgetTransportir"),
          link: "/budget-transportir",
        },
      ]}
    >
      <SyncOverlay loading={pageLoading} />
      <ModalBudgetTransportirCreate
        visible={modalCreateShow}
        onCancel={() => {
          setModalCreateShow(false);
        }}
        onSuccess={() => {
          loadBudgetTransportirs();
          setModalCreateShow(false);
          message.success(
            `${t("budgetTransportir")} ${t("toastSuffixSuccess")} ${t("toastCreated")}`,
          );
        }}
        setPageLoading={setPageLoading}
      />
      <ModalBudgetTransportirEdit
        visible={modalEditShow}
        onCancel={() => {
          setModalEditShow(false);
        }}
        id={modalEditId}
        onSuccess={() => {
          loadBudgetTransportirs();
          setModalEditShow(false);
          message.success(
            `${t("budgetTransportir")} ${t("toastSuffixSuccess")} ${t("toastEdited")}`,
          );
        }}
        setPageLoading={setPageLoading}
      />
      {/* <Form className="mb-2 w-100" onFinish={onFinish}>
        <Row gutter={12}>
          <Col xs={{ span: 24 }} md={{ span: 24 }} lg={{ span: 20 }} xl={{ span: 21 }}>
            <Form.Item name="search" className="mb-2">
              <Input
                prefix={<SearchOutlined className="site-form-item-icon" />}
                placeholder={t("searchHere")}
                className="w-100"
              />
            </Form.Item>
          </Col>
          <Col xs={{ span: 24 }} md={{ span: 24 }} lg={{ span: 4 }} xl={{ span: 3 }}>
            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" block>
                {t("search")}
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form> */}
      <Table
        size="small"
        dataSource={dataSource}
        columns={columns}
        pagination={{
          ...configs.TABLE_PAGINATION,
          total: totalData,
          pageSize: pageSize,
        }}
        scroll={configs.TABLE_SCROLL}
        onChange={onTableChange}
      />
    </PageContainer>
  );
};

export default withRouter(BudgetTransportirView);
