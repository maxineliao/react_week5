import "./App.css";
import { useState, useEffect, useRef } from "react";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import { Modal } from "bootstrap";
import { useForm, useWatch } from "react-hook-form";
import axios from "axios";
import { useMemo } from "react";
const { VITE_API_BASE, VITE_API_PATH } = import.meta.env;

//購物車數量更改
function FormCartQty({ qty, id, adjustCartItem }) {
	const { register, control, reset } = useForm({
		// 使用參數 defaultValues
		defaultValues: {
			cartItemQty: qty,
		},
	});
	useEffect(() => {
		reset({ cartItemQty: qty });
	}, [qty, reset]); // 監聽 qty 變更

	const watchQty = useWatch({
		control,
		name: "cartItemQty",
	});

	useEffect(() => {
		if (watchQty !== undefined) {
			adjustCartItem(Number(watchQty), id);
		}
	}, [watchQty]);
	return (
		<input
			{...register("cartItemQty")}
			type="number"
			style={{ width: "60px" }}
			className="me-1"
		/>
	);
}

//訂單表單
function FormCustomerData({ submitOrder, tempCartList }) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm({
		defaultValues: {
			email: "",
			name: "",
			tel: "",
			address: "",
			message: "",
		},
		mode: "onChange",
	});
	const onSubmitCustomer = (data) => {
		const newCustomerData = {
			user: {
				name: data.name,
				email: data.email,
				tel: data.tel,
				address: data.address,
			},
			message: data.message,
		};
		submitOrder(newCustomerData);
		reset();
	};
	return (
		<form className="col-md-6" onSubmit={handleSubmit(onSubmitCustomer)}>
			<div className="mb-3">
				<label htmlFor="email" className="form-label">
					Email
				</label>
				<input
					id="email"
					type="email"
					className="form-control"
					placeholder="請輸入 Email"
					{...register("email", {
						required: "Email為必填",
						pattern: {
							value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
							message: "請檢查Email格式",
						},
					})}
				/>
				<div className="text-danger">
					{errors.email ? errors.email?.message : ""}
				</div>
			</div>

			<div className="mb-3">
				<label htmlFor="name" className="form-label">
					收件人姓名
				</label>
				<input
					id="name"
					type="text"
					className="form-control"
					placeholder="請輸入姓名"
					{...register("name", {
						required: "姓名為必填",
					})}
				/>
				<div className="text-danger">
					{errors.name ? errors.name?.message : ""}
				</div>
			</div>

			<div className="mb-3">
				<label htmlFor="tel" className="form-label">
					收件人電話
				</label>
				<input
					id="tel"
					type="text"
					className="form-control"
					placeholder="請輸入手機號碼"
					{...register("tel", {
						required: "手機號碼為必填",
						pattern: {
							value: /^09\d{8}$/,
							message: "請檢查手機號碼是否正確（僅接受台灣門號）",
						},
					})}
				/>
				<div className="text-danger">
					{errors.tel ? errors.tel?.message : ""}
				</div>
			</div>

			<div className="mb-3">
				<label htmlFor="address" className="form-label">
					收件人地址
				</label>
				<input
					id="address"
					type="text"
					className="form-control"
					placeholder="請輸入地址"
					{...register("address", {
						required: "地址為必填",
					})}
				/>
				<div className="text-danger">
					{errors.address ? errors.address?.message : ""}
				</div>
			</div>

			<div className="mb-3">
				<label htmlFor="message" className="form-label">
					留言
				</label>
				<textarea
					id="message"
					className="form-control"
					cols="30"
					rows="10"
					{...register("message")}
				></textarea>
			</div>
			<div className="text-end mb-5">
				<button
					type="submit"
					className="btn btn-danger"
					disabled={tempCartList.length === 0}
				>
					送出訂單
				</button>
			</div>
		</form>
	);
}

function App() {
	//處理Modal aria-hidden問題
	window.addEventListener("hide.bs.modal", () => {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	});

	const [productList, setProductList] = useState([]);
	const [tempProduct, setTempProduct] = useState({});
	const [tempCartList, setTempCartList] = useState([]);
	const [productToDel, setProductToDel] = useState([]);
	const [deleteMode, setDeleteMode] = useState("");

	const modalRef = useRef(null);
	const productModalRef = useRef(null);
	const delModalRef = useRef(null);
	const delProductModalRef = useRef(null);

	//計算原價總額
	const originPriceTotal = useMemo(() => {
		return tempCartList.reduce(
			(acc, item) => acc + item.product.origin_price * item.qty,
			0
		);
	}, [tempCartList]);

	//計算實際總額
	const priceTotal = useMemo(() => {
		return tempCartList.reduce((acc, item) => acc + item.total, 0);
	}, [tempCartList]);

	//產品Modal
	const openProductModal = () => {
		productModalRef.current.show();
	};

	//刪除Modal
	const openDelModal = () => {
		delProductModalRef.current.show();
	};
	const getProductList = async () => {
		try {
			const response = await axios.get(
				`${VITE_API_BASE}/api/${VITE_API_PATH}/products`
			);
			setProductList(...productList, response.data.products);
		} catch (error) {
			console.log(error.response.data);
		}
	};

	//新增至購物車
	const addToCart = async (id) => {
		const existedItem = tempCartList.filter((item) => {
			return item.product.id === id;
		});
		if (existedItem.length !== 0) {
			try {
				const response = await axios.put(
					`${VITE_API_BASE}/api/${VITE_API_PATH}/cart/${existedItem[0].id}`,
					{
						data: {
							product_id: id,
							qty: Number(existedItem[0].qty) + 1,
						},
					}
				);
				alert(response.data.message);
				getCartList();
				productModalRef.current.hide();
			} catch (error) {
				console.log(error.response.data);
			}
		} else {
			try {
				const response = await axios.post(
					`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`,
					{
						data: {
							product_id: id,
							qty: 1,
						},
					}
				);
				alert(response.data.message);
				getCartList();
				productModalRef.current.hide();
			} catch (error) {
				console.log(error.response.data);
			}
		}
	};

	//取得購物車
	const getCartList = async () => {
		try {
			const response = await axios.get(
				`${VITE_API_BASE}/api/${VITE_API_PATH}/cart`
			);
			setTempCartList(response.data.data.carts);
		} catch (error) {
			console.log(error.response.data);
		}
	};

	//刪除特定商品/清空購物車
	const delCartItem = async () => {
		try {
			const response = await axios.delete(
				`${VITE_API_BASE}/api/${VITE_API_PATH}/cart${
					deleteMode === "singleItem" ? "/" + productToDel : "s"
				}`
			);
			getCartList();
			delProductModalRef.current.hide();
			alert(
				deleteMode === "singleItem" ? "已刪除商品！" : "已清空購物車！"
			);
			setProductToDel("");
		} catch (error) {
			console.log(error.response.data);
		}
	};

	//修改商品數量
	const adjustCartItem = async (qty, id) => {
		try {
			const response = await axios.put(
				`${VITE_API_BASE}/api/${VITE_API_PATH}/cart/${id}`,
				{
					data: {
						product_id: id,
						qty: qty,
					},
				}
			);
			getCartList();
		} catch (error) {
			console.log(error.response.data);
		}
	};

	//送出訂單
	const submitOrder = async (data) => {
		try {
			const response = await axios.post(
				`${VITE_API_BASE}/api/${VITE_API_PATH}/order`,
				{
					data: data,
				}
			);
			console.log(response);
			alert("成功送出訂單！");
			getCartList();
		} catch (error) {
			console.log(error.response.data);
		}
	};

	useEffect(() => {
		productModalRef.current = new Modal(modalRef.current);
		delProductModalRef.current = new Modal(delModalRef.current);
		setProductToDel("");
		getProductList();
		getCartList();
	}, []);
	useEffect(() => {}, [tempCartList]);

	return (
		<>
			<div className="container">
				<div className="mt-4">
					{/* 產品Modal */}
					<table className="table align-middle">
						<thead>
							<tr>
								<th>圖片</th>
								<th>商品名稱</th>
								<th>價格</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{productList.map((item) => {
								return (
									<tr key={item.id}>
										<td
											style={{
												width: "200px",
											}}
										>
											<div
												style={{
													height: "100px",
													backgroundSize: "cover",
													backgroundPosition:
														"center",
													backgroundImage: `url(${item.imageUrl})`,
												}}
											></div>
										</td>
										<td>{item.title}</td>
										<td>
											<div className="h5"></div>
											<del className="h6">
												原價 ${item.origin_price}
											</del>
											<br />${item.price}
											<div className="h5"></div>
										</td>
										<td>
											<div className="btn-group btn-group-sm">
												<button
													type="button"
													className="btn btn-outline-secondary"
													onClick={() => {
														setTempProduct(item);
														openProductModal();
													}}
												>
													<i className="fas fa-spinner fa-pulse"></i>
													查看更多
												</button>
												<button
													type="button"
													className="btn btn-outline-danger"
													onClick={() =>
														addToCart(item.id)
													}
												>
													<i className="fas fa-spinner fa-pulse"></i>
													加到購物車
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
					<div className="text-end">
						<button
							className="btn btn-outline-danger"
							type="button"
							onClick={() => {
								setDeleteMode("cart");
								openDelModal();
							}}
							disabled={tempCartList.length === 0}
						>
							清空購物車
						</button>
					</div>

					<table className="table align-middle">
						<thead>
							<tr>
								<th></th>
								<th>品名</th>
								<th style={{ width: "150px" }}>數量/單位</th>
								<th>單價</th>
								<th></th>
							</tr>
						</thead>

						{tempCartList && tempCartList.length > 0 ? (
							<>
								<tbody>
									{tempCartList.map((item, index) => {
										return (
											<tr key={item.id}>
												<td
													style={{
														width: "200px",
													}}
												>
													<div
														style={{
															height: "100px",
															backgroundSize:
																"cover",
															backgroundPosition:
																"center",
															backgroundImage: `url(${item.product.imageUrl})`,
														}}
													></div>
												</td>
												<td>{item.product.title}</td>
												<td>
													<FormCartQty
														qty={item.qty}
														id={item.id}
														adjustCartItem={
															adjustCartItem
														}
														getCartList={
															getCartList
														}
													/>
													/{item.product.unit}
												</td>
												<td>
													<del>
														$
														{
															item.product
																.origin_price
														}
													</del>
													<br />${item.product.price}
												</td>
												<td>
													<button
														className="btn btn-outline-danger"
														type="button"
														onClick={() => {
															setProductToDel(
																item.id
															);
															setDeleteMode(
																"singleItem"
															);
															openDelModal();
														}}
													>
														刪除
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
								<tfoot>
									<tr>
										<td colSpan="4" className="text-end">
											總計
										</td>
										<td className="text-end">
											${originPriceTotal}
										</td>
									</tr>
									<tr>
										<td
											colSpan="4"
											className="text-end text-success"
										>
											折扣價
										</td>
										<td className="text-end text-success">
											${priceTotal}
										</td>
									</tr>
								</tfoot>
							</>
						) : (
							<tbody>
								<tr>
									<td colSpan="5">
										購物車空空的，快去逛逛吧d(`･∀･)b
									</td>
								</tr>
							</tbody>
						)}
					</table>
				</div>
				<div className="my-5 row justify-content-center">
					<FormCustomerData
						submitOrder={submitOrder}
						tempCartList={tempCartList}
						getCartList={getCartList}
					/>
				</div>
			</div>
			<div className="modal" tabIndex="-1" ref={modalRef}>
				<div className="modal-dialog">
					<div className="modal-content">
						<div className="modal-header">
							<h5 className="modal-title">商品詳情</h5>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								aria-label="Close"
							></button>
						</div>
						<div className="modal-body">
							<img
								className="img-fluid"
								src={tempProduct.imageUrl}
								alt={tempProduct.title}
								style={{
									height: "300px",
									objectFit: "cover",
								}}
							/>
							<p className="title">
								<span className="badge text-bg-secondary me-2 mt-3">
									{tempProduct.category}
								</span>
								<b>{tempProduct.title}</b>
							</p>
							<p className="description">
								{tempProduct.description}
							</p>
							<p className="price">
								原價 <del>${tempProduct.origin_price}</del>
							</p>
							<p className="price text-primary">
								售價 ${tempProduct.price}
							</p>
						</div>
						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-secondary"
								data-bs-dismiss="modal"
							>
								關閉
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => addToCart(tempProduct.id)}
							>
								加到購物車
							</button>
						</div>
					</div>
				</div>
			</div>
			<div className="modal" tabIndex="-1" ref={delModalRef}>
				<div className="modal-dialog">
					<div className="modal-content">
						<div className="modal-header">
							<h5 className="modal-title">
								{deleteMode === "singleItem"
									? "刪除商品"
									: "清空購物車"}
							</h5>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								aria-label="Close"
							></button>
						</div>
						<div className="modal-body">
							<p>
								{deleteMode === "singleItem" ? "刪除" : "清空"}
								後無法復原，確認刪除？
							</p>
						</div>
						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-secondary"
								data-bs-dismiss="modal"
							>
								關閉
							</button>
							<button
								type="button"
								className="btn btn-danger"
								onClick={() => {
									delCartItem();
								}}
							>
								刪除
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

export default App;
